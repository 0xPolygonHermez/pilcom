// import {Expressions} from './expressions.js';

const path = require("path");
const fs = require("fs");
const pil_parser = require("../build/pil_parser.js");
const { check } = require("yargs");
const Scalar = require("ffjavascript").Scalar;
const Expressions = require("./expressions.js");
const Definitions = require("./definitions.js");
const Processor = require("./processor.js");
const { mainModule } = require("process");


const oldParseError = pil_parser.Parser.prototype.parseError;

class SkipNamespace extends Error {
    constructor(namespace, name = false) {
        super(name ? `Pol ${namespace}.${name} must be skipped` : `Namespace ${namespace} must be skipped`);
        this.namespace = namespace;
        this.name = name;
    }
}

class Compiler {

    constructor(Fr) {
        this.Fr = Fr;
        this.references = new Definitions(Fr);
        this.constants = new Definitions(Fr);
        this.publics = new Definitions(Fr);
        this.expressions = new Expressions(Fr, this, this.references, this.publics, this.constants);
        this.processor = new Processor(Fr, this, this.references, this.expressions);
    }

    initContext() {
        this.subproofs = {};
        this.nWitnessCols = 0;
        this.nFixedCols = 0;
        this.nIm = 0;
        this.nQ = 0;
        this.nPublic = 0;
        this.polIdentities = [];
        this.plookupIdentities = [];
        this.permutationIdentities = [];
        this.connectionIdentities = [];
        this.namespace = "Global";
        this.includedFiles = {};
        this.namespaces = true;
        this.skippedNamespaces = {};
        this.skippedPols = {};
        this.includePaths = (this.config && this.config.includePaths) ? (Array.isArray(this.config.includePaths) ? this.config.includePaths: [this.config.includePaths]): [];
        this.relativeFileName = '';
    }
    async compile(fileName, config = {}) {
        const isMain = true;
        this.initContext();

        if (config) {
            this.config = config;
            if (this.config.namespaces) {
                this.namespaces = {};
                for (const name of this.config.namespaces) {
                    this.namespaces[name] = 0;
                }
            }
            if (this.config.defines && typeof this.config.defines === 'object') {
                for (const name in this.config.defines) {
                    this.constants.define(name, this.Fr.e(this.config.defines[name]));
                }
            }
        } else {
            this.config = {};
        }
        const ansiColor = this.config.color ? (x) => '\x1b['+x+'m' : (x) => '';

        await this.parseSource(fileName, true);
        console.log('\x1b[1;35m==== CONSTANTS ====');
        this.constants.dump();
        console.log('\x1b[0m');
        this.checkNotFoundNamespaces();
        this.checkUndefinedPols();
        this.simplifyAll();
        // this.checkUnusedExpressions();
        this.checkExpressionsDegree();
        this.reduceExpressions();
        return this.contextToJson();
    }
    instanceParser(src, fullFileName) {
        this.srcLines = src.split(/(?:\r\n|\n|\r)/);

        const myErr = function (str, hash) {
            str = fullFileName + " -> " + str;
            oldParseError(str, hash);
        };
        pil_parser.Parser.prototype.parseError = myErr;

        let parser = new pil_parser.Parser();
        const parserPerformAction = parser.performAction;
        const productions = parser.productions_;
        let compiler = this;
        parser.performAction = function (yytext, yyleng, yylineno, yy, yystate, $$, _$ ) {
            console.log(yystate);
            const result = parserPerformAction.apply(this, arguments);
            const first = _$[$$.length - 1 - productions[yystate][1]];
            const last = _$[$$.length - 1];
            if (typeof this.$ !== 'object')  {
                if (!this.$) {
                    console.log(`STRANGE THINK IN STATE ${yystate} `+(typeof this.$));
                    this.$ = {};
                }
                else {
                    return result;
                }
            }
            this.$.debug = `${compiler.relativeFileName} ${first.first_line}:${first.first_column}`;
            if (typeof last.last_line != 'undefined' && last.last_line != first.first_line) {
                this.$.debug += ` ${last.last_line}`;
            }
            if (typeof last.last_column != 'undefined') {
                this.$.debug += `:${last.last_column}`;
            }
            /*
            this.$.first_line = first.first_line;
            this.$.first_column = first.first_column;
            this.$.last_line = last.last_line || first.first_line;
            this.$.last_column = last.last_column || first.first_column;*/
            return result;
        }
        return parser;
    }
    async parseSource(fileName, isMain = false) {

        console.log(`#################### PARSE SOURCE ${fileName} ######################################`);
        const [src, fileDir, fullFileName, relativeFileName] = await this.loadSource(fileName, isMain);
        console.log(`#################### LOADED ${fileName} ######################################`);

        this.relativeFileName = relativeFileName;
        this.fileDir = fileDir;

        const parser = this.instanceParser(src,fullFileName);
        const sts = parser.parse(src);

        let pendingCommands = [];
        let lastLineAllowsCommand = false;

        if (!isMain) {
            console.log(sts);
        }
        for (let i=0; i<sts.length; i++) {
            const s = {...sts[i], locator: fileName+'@'+i };
            console.log('### LOCATOR ### ==== > '+s.locator);
            this.fileName = s.fileName = relativeFileName;
            this.line = s.first_line;
            console.log('S');
            console.log(s);
            this.sourceRef = `${s.fileName}:${s.first_line}`;

            let skip = false;
            let poldef = false;
            let insideIncludedDomain = false;

            const ctxExprLen = this.expressions.length;
            try {
                this.checkNamespace(this.namespace);
                insideIncludedDomain = true;
                await this.parseStatement(s);
            } catch (err) {
                if (err instanceof SkipNamespace) {
                    skip = true;
                } else {
                    throw err;
                }
            }
            if (!skip) continue;

            if (insideIncludedDomain) {
                let verboseInfo = '';
                if (this.config.verbose) {
                    verboseInfo = ':\n' + ansiColor(36) + srcLines.slice(s.first_line-1, Math.min(s.first_line+3, s.last_line)).join('\n');
                    const lineStrLines = s.last_line - s.first_line + 1;
                    if (lineStrLines > 3) verboseInfo += " ...";
                    verboseInfo += ansiColor(0) +'\n';
                }
                console.log(`NOTE: ${this.relativeFileName}:${s.first_line} was ignored${verboseInfo}`);
            }

            if (poldef) {
                console.log(`adding ${poldef} to exclude`);
                this.skippedPols[poldef] = true;
            }
            while (ctxExprLen < this.expressions.length) {
                this.expressions.pop();
            }
        }
    }
    async parseStatements(statements) {
        for (const s of statements) {
            const res = await this.parseStatement(s);
            if (typeof res === 'boolean') {
                return res;
            }
        }
    }
    async parseStatement(s) {
        const method = ('do_'+s.type).replace(/[-_][a-z]/g, (group) => group.slice(-1).toUpperCase());
        console.log(`[${s.type}] ===> ${method}`);
        if (!(method in this)) {
            console.log('==== ERROR ====');
            console.log(s);
            this.error(s, `Invalid line type: ${s.type}`);
        }
        if (this[method].constructor.name === 'AsyncFunction') {
            console.log(`CALLING ASYNC FUNCTION ${method}`)
            return await this[method](s);
        }
        console.log(`REGULAR CALLING FUNCTION ${method}`)
        return this[method](s);
    }
    doWitnessColDeclaration(s) {
        this.nWitnessCols = this.colDeclaration(s, 'witness', this.nWitnessCols);
    }
    doFixedColDeclaration(s) {
        this.nFixedCols = this.colDeclaration(s, 'fixed', this.nFixedCols);
    }
    doColDeclaration(s) {
        this.nIm = this.colDeclaration(s, 'im', this.nIm, true);
    }
    colDeclaration(s, type, nextId, reserveExpressions = false) {
        console.log('*********');
        console.log(s);
        for (const col of s.items) {
            const colname = this.getFullName(col);;
            console.log(`COL_DECLARATION(${colname})`);
            let ref = this.references.get(colname);
            if (ref !== null) {
                this.error(s, `${colname} already defined on ${ref.sourceRef}`);
            }
            // TODO: multidimensional-array
            let len = (col.type === 'array') ? this.getExprNumber(col.expLen, s, `${colname} array size`) : 1;
            const refId = reserveExpressions ? this.expressions.reserve(len) : nextId;
            ref = {
                type,
                id: refId,
                colDeg: this.colDeg,
                sourceRef: s.sourceRef,
                isArray: (col.type === 'array'),
            };
            if (col.type === 'array') {
                ref.len = len;
            }
            nextId += len;
            this.references.define(colname, ref);
        }
        return nextId;
    }
    addExpression(expr)
    {
        this.addFilename(expr, this.relativeFileName);
        return this.expressions.insert(expr);
    }
    updateExpression(id, expr)
    {
        this.addFilename(expr, this.relativeFileName);
        return this.expressions.update(id, expr);
    }
    async doInclude(s) {
        console.log(`doInclude ======${s.file.value}`);
        console.log(s);
        console.log([this.fileDir, s.fileName]);
        const includeFile = this.asString(s.file);
        const fullFileNameI = this.config.includePaths ? s.file : path.resolve(this.fileDir, includeFile);
        if (!this.includedFiles[fullFileNameI]) {       // If a file included twice just ignore
            console.log(`doInclude ======${s.file.value}============== PROCESS`);
            this.includedFiles[fullFileNameI] = true;
            const previous = [this.namespace, this.cwd, this.relativeFileName, this.fileDir ];

            this.namespace = false;
            this.cwd = this.fileDir;
            await this.parseSource(fullFileNameI, false);

            [this.namespace, this.cwd, this.relativeFileName, this.fileDir ] = previous;

            // TODO -> review this part
            // if (pendingCommands.length>0) this.error(s, "command not allowed before include");
            // lastLineAllowsCommand = false;
        } else {
            console.log(`doInclude ======${s.file.value}============== IGNORE`);
        }
        console.log('doInclude END');
        return true;
    }
    async doNamespace(s) {
        const subproof = s.subproof ?? false;
        const namespace = s.namespace;
        if (subproof !== false && !(subproof in this.subproofs)) {
            this.error(s, `subproof ${s.subproof} hasn't been defined`);
        }

        // TODO: verify if namespace just was declared in this case subproof must be the same
        const previous = [this.namespace, this.subproof ];
        this.namespace = namespace;
        this.subproof = subproof;
        console.log(s);
        await this.parseStatements(s.statements);
        [this.namespace, this.subproof ] = previous;
    }
    doSubproofDefinition(s) {
        const subproof = s.name ?? false;
        console.log(`doSubproofDefinition ====== ${subproof}`);
        if (subproof === false) {
            this.error(s, `subproof not defined correctly`);
        }
        const subproofInfo = this.subproofs[subproof];
        if (subproofInfo !== undefined) {
            this.error(s, `subproof ${subproof} has been defined previously on ${subproofInfo.sourceRef}`);
        }
        let rows = [];
        // TO-DO: eval expressions;
        this.subproofs[subproof] = {
            sourceRef: this.sourceRef,
            rows
        };
    }
    doPolDefinition(s) {
        const polname = this.namespace + "." + s.name;
        s.expression.poldef = polname;
        const eidx = this.addExpression(s.expression);
        let ref = this.references.get(polname);
        if (ref !== null) {
            this.error(s, `${polname} already defined on ${ref.sourceRef}`);
        }
        ref = {
            type: 'imP',
            id: eidx,
            polDeg: this.polDeg,
            sourceRef: s.sourceRef,
        };
        this.references.define(polname, ref);
        this.nIm++;
    }
    setPol(s) {
//        const polname = this.namespace + "." + s.name;
//        let ref = this.references.get(polname);
        const [polname, ref, id] = this.expressions.resolveReference(s);

        if (ref.type === 'var') {
            ref.value = this.expressions.e2num(s.expression);
            this.references.set(polname, ref);
        } else {
            if (this.expressions.get(id) !== null) {
                this.error(s, `multiple initializations of ${polref}`);
            }
            s.expression.poldef = polname;
            this.updateExpression(id, s.expression);
        }
    }
    doConstraint(s) {
        console.log('********** doConstraint ********** (s.expression:)');
        let constraint = {op: 'sub', values: [s.left, s.right]};
        console.log(s);
        this.expressions.toString(constraint);
        let expr = this.expressions.evaluate(constraint, {update: true, Fr: this.Fr});
        console.log('********** doConstraint ********** (expr)');
        this.expressions.toString(expr);
        const eidx = this.addExpression(expr);
        this.constraints.push({fileName: this.relativeFileName, namespace: this.namespace, line: s.first_line, e: eidx});
    }
    composePlPeIdentity(s) {
        const pu = {
            fileName: this.relativeFileName,
            namespace: this.namespace,
            line: s.first_line,
            f: [],
            t: [],
            selF: null,
            selT: null
        }
        s.f.forEach(expr => pu.f.push(this.addExpression(expr)));
        if (s.selF) {
            pu.selF = this.addExpression(s.selF);
        }
        s.t.forEach(expr => pu.t.push(this.addExpression(expr)));
        if (s.selT) {
            pu.selT = this.addExpression(s.selT);
        }
        if (pu.f.length != pu.t.length ) {
            this.error(s, `${s.type} with diferent number of elements`);
        }
        return pu;
    }
    doPlookupIdentity(s) {
        this.plookupIdentities.push(this.composePlPeIdentity(s));
    }
    doPermutationIdentity(s) {
        this.permutationIdentities.push(this.composePlPeIdentity(s));
    }
    doConnectionIdentity(s) {
        const ci = {
            fileName: this.relativeFileName,
            namespace: this.namespace,
            line: s.first_line,
            pols: [],
            connections: [],
        }
        s.pols.forEach(expr => ci.pols.push(this.addExpression(expr)));
        s.connections.forEach(expr => ci.connections.push(this.addExpression(expr)));
        if (ci.pols.length != ci.connections.length ) {
            this.error(s, `connection with diferent number of elements`);
        }
        this.connectionIdentities.push(ci);
    }
    getExprNumber(expr, s, title) {
        console.log(expr);
        const se = this.expressions.simplifyExpression(expr);
        if (se.op !== 'number') {
            this.error(s, title + ' is not constant expression');
        }
        return Number(se.value);
    }
    getReferenceArrayOffset(s, pol, polname) {
        if (!this.references.isDefined(polname)) {
            this.error(s, `polynomial ${polname} not defined`);
        }
        const ref = this.references.get(polname);

        if (pol.idxExp && !ref.isArray) {
            this.error(s, `${polname} is not an Array`);
        }
        if (!pol.idxExp && ref.isArray) {
            console.log([pol, ref]);
            this.error(s, `${polname}: index of an array not specified`);
        }
        const offset = ref.isArray ? this.getExprNumber(pol.idxExp, s, 'Index') : 0;
        return [ref, offset];
    }
    doFunctionDefinition(s) {
        // this.functions.define()
    }
    doPublicDeclaration(s) {
        if (this.publics.isDefined(s.name)) {
            this.error(s, `name already defined ${s.name}`);
        }
        const polname = (s.pol.namespace === 'this' ? this.namespace : s.pol.namespace) + '.' + s.pol.name;
        const [ref, offset] = this.getReferenceArrayOffset(s, s.pol, polname);
        const idx = this.getExprNumber(s.idx, s, 'Index of a public');
        this.publics.define(s.name, {
            polType: ref.type,
            polId: Number(ref.id) + offset,
            idx,
            id: this.nPublic++
        });
    }
    doConstantDefinition(s) {
        if (this.config.defines && s.name in this.config.defines) {
            console.log(`NOTICE: Ignore constant definition ${s.name} on ${this.relativeFileName}:${s.first_line} because it was pre-defined`);
            return;
        }
        if (this.constants.isDefined(s.name)) {
            this.error(s, `name already defined ${s.name}`);
        }
        this.constants.define(s.name, this.getExprNumber(s.value, s, `constant ${s.name} definition`));
    }
    doCode(s) {
        return this.processor.execute(s.statments);
    }
    async loadSource(fileName, isMain) {
        let fullFileName, fileDir, src;
        let relativeFileName = '';
        let includePathIndex = 0;
        if (isMain && this.config.compileFromString) {
            relativeFileName = fullFileName = "(string)";
            fileDir = '';
            src = fileName;
        }
        else {
            let includePaths = [...this.includePaths];
            let directIncludePathIndex;
            const cwd = this.cwd ? this.cwd : process.cwd();

            if (this.config.includePathFirst) {
                directIncludePathIndex = includePaths.length;
                includePaths.push(cwd);
            }
            else {
                directIncludePathIndex = 0;
                includePaths.unshift(cwd);
            }
            do {
                fullFileName = path.resolve(includePaths[includePathIndex], fileName);
                if (fs.existsSync(fullFileName)) break;
                ++includePathIndex;
            } while (includePathIndex < includePaths.length);

            fileDir = path.dirname(fullFileName);

            if (includePathIndex != directIncludePathIndex) {
                relativeFileName = fileName;
            }
            else {
                if (isMain) {
                    relativeFileName = path.basename(fullFileName);
                    this.basePath = fileDir;
                } else {
                    if (fullFileName.startsWith(this.basePath)) {
                        relativeFileName = fullFileName.substring(this.basePath.length+1);
                    } else {
                        relativeFileName = fullFileName;
                    }
                }
            }
            console.log(`LOADING FILE ${fullFileName} .............`)
            src = await fs.promises.readFile(fullFileName, "utf8") + "\n";
            console.log('END LOADING ...');
        }
        console.log('################ BEGIN SOURCE #########################');
        console.log(src);
        console.log('################ END SOURCE #########################');
        return [src, fileDir, fullFileName, relativeFileName];
    }

    reduceExpressions() {
        for (const pol of this.polIdentities) {
            this.expressions.reduceTo2(pol.e);
        }
        for (const plpe of [this.plookupIdentities, this.permutationIdentities]) {
            for (const pol of plpe) {
                for (const f of pol.f) {
                    this.expressions.reduceTo1(f);
                }
                if (pol.selF) {
                    this.expressions.reduceTo1(pol.selF);
                }
                for (const t of pol.t) {
                    this.expressions.reduceTo1(t);
                }
                if (pol.selT) {
                    this.expressions.reduceTo1(pol.selT);
                }
            }
        }
        for (const pol of this.connectionIdentities) {
            for (const p of pol.pols) {
                this.expressions.reduceTo1(p);
            }
            for (const co of pol.connections) {
                this.expressions.reduceTo1(co);
            }
        }
    }
    error (l, err) {
        if (err instanceof Error) {
            err.message = `ERROR ${l.fileName}:${l.first_line}: ${err.message}`
            throw(err);
        } else {
            const msg = `ERROR ${l.fileName}:${l.first_line}: ${err}`;
            throw new Error(msg);
        }
    }
    expressionToJson(e, deps) {
        let main = false;
        if (!deps) {
            deps = [];
            main = true;
        }
        const out = {
            op: e.op
        }
        out.deg = e.deg;
        if (e.op == 'pol') {
            const polname = e.namespace + '.' + e.name
            const [ref, offset] = this.getReferenceArrayOffset(e, e, polname);
            out.id = Number(ref.id) + offset;
            if (ref.type === 'cmP') {
                out.op = 'cm';
            } else if (ref.type === 'constP') {
                out.op = 'const';
            } else if (ref.type === 'imP') {
                // TODO: array support on temporal
                if (!main) {
                    deps.push(ref.id);
                }
                out.op = 'exp'
            }
            out.next = e.next;
        }
        if (e.op == "public") {
            const ref = this.publics.get(e.name);
            out.id = ref.id;
            out.op = 'public';
        }
        if (typeof e.idQ !== 'undefined') {
            out.idQ = e.idQ;
        }
        if (typeof e.values !== 'undefined') {
            out.values = e.values.map(value => this.expressionToJson(value, deps));
        }
        if (typeof e.value !== 'undefined') {
            out.value = e.value;
        }
        if (typeof e.const !== 'undefined') {
            out.const = e.const;
        }
        if (main && deps.length>0) {
            out.deps = deps;
        }
        return out;
    }
    contextToJson() {
        let out = {
            nCommitments: this.nCommitments,
            nQ: this.nQ,
            nIm: this.nIm,
            nConstants: this.nConstants,
            publics: [],
            references: {},
            expressions: [],
            polIdentities: [],
            plookupIdentities: [],
            permutationIdentities: [],
            connectionIdentities: []
        };

        for (const [name,ref] of this.references.keyValues()) {
            out.references[name] = {
                type: ref.type,
                id: ref.id,
                polDeg: ref.polDeg,
                isArray: ref.isArray ? true:false };
            if (ref.isArray) {
                out.references[name].len = ref.len;
            }
        }

        for (const [name, pub] of this.publics.keyValues()) {
            out.publics[pub.id] = pub;
            out.publics[pub.id].name = name;
        }

        for (const expr of this.expressions) {
            out.expressions.push(this.expressionToJson(expr));
        }

        for (const pi of this.polIdentities) {
            out.polIdentities.push({
                e: pi.e,
                fileName: pi.fileName,
                line: pi.line
            });
        }

        for (const ptype of ['plookupIdentities', 'permutationIdentities']) {
            for (const p of this[ptype]) {
                out[ptype].push({
                    f: p.f,
                    t: p.t,
                    selF: p.selF,
                    selT: p.selT,
                    fileName: p.fileName,
                    line: p.line});
            }
        }

        for (const ci of this.connectionIdentities) {
            out.connectionIdentities.push({
                pols: ci.pols,
                connections: ci.connections,
                fileName: ci.fileName,
                line: ci.line });
        }

        return out;
    }

    addFilename(exp, fileName) {
        exp.fileName = fileName;
        if (exp.namespace === "this") exp.namespace = this.namespace;
        else if (exp.namespace) this.checkNamespace(exp.namespace);

        if (exp.name) this.checkSkippedPols(exp.namespace, exp.name);
        if (exp.values) {
            for(let i=0; i<exp.values.length; i++) this.addFilename(exp.values[i], fileName);
        }
    }

    checkNamespace (namespace, exceptionToSkip = true) {
        if (!namespace || this.namespaces === true) {
            return true;
        }
        if (typeof this.namespaces[namespace] !== 'undefined') {
            ++this.namespaces[namespace];
            return true;
        }
        if (!this.skippedNamespaces[namespace]) {
            this.skippedNamespaces[namespace] = 0;
            console.log(`NOTE: namespace ${namespace} was ignored`);
        }
        ++this.skippedNamespaces[namespace];
        if (exceptionToSkip) {
            throw new SkipNamespace(namespace);
        }
        return false;
    }

    checkSkippedPols (namespace, name, exceptionToSkip = true) {
        if (this.namespaces === true) return true;
        if (!this.skippedPols[namespace + '.' + name]) return true;
        if (exceptionToSkip) {
            throw new SkipNamespace(namespace, name);
        }
        return false;
    }

    getNewIdQ() {
        return this.nQ++;
    }

    simplifyAll() {
        for (const n in this.publics) {
            const pub = this.publics[n];
            if (pub.polType == "imP") {
                this.expressions.simplify(pub.polId);
            }
        }
        for (const pi of this.polIdentities) {
            this.namespace = pi.namespace;
            this.expressions.simplify(pi.e);
        }
        for (const po of this.plookupIdentities) {
            this.namespace = po.namespace;
            for (const f of po.f) {
                this.expressions.simplify(f);
            }
            if (po.selF !== null) {
                this.expressions.simplify(po.selF);
            }
            for (const t of po.t) {
                this.expressions.simplify(t);
            }
            if (po.selT !== null) {
                this.expressions.simplify(po.selT);
            }
        }
        for (const pe of this.permutationIdentities) {
            this.namespace = pe.namespace;
            for (const f of pe.f) {
                this.expressions.simplify(f);
            }
            if (pe.selF !== null) {
                this.expressions.simplify(pe.selF);
            }
            for (const t of pe.t) {
                this.expressions.simplify(t);
            }
            if (pe.selT !== null) {
                this.expressions.simplify(pe.selT);
            }
        }
        for (const ci of this.connectionIdentities) {
            this.namespace = ci.namespace;
            for (const pol of ci.pols) {
                this.expressions.simplify(pol);
            }
            for (const co of ci.connections) {
                this.expressions.simplify(co);
            }
        }
    }
    checkNotFoundNamespaces() {
        if (typeof this.namespaces === 'object') {
            let notFoundNamespaces = Object.keys(this.namespaces).filter(namespace => this.namespaces[namespace] === 0);
            if (notFoundNamespaces.length) {
                throw new Error('ERROR: namespaces not found: '+notFoundNamespaces.join(', '));
            }
        }
    }
    checkUndefinedPols() {
        let undefined = 0;
        let names = [];
        for (const [name, ref] of this.references.keyValues()) {
            if (ref.type !== 'imP') continue;
            const len = ref.isArray ? ref.len : 1;
            let fromId = ref.id;
            let reported = false;
            for (let index = 0; index < len; ++index ) {
                if (this.expressions.get(fromId + index) !== null) continue;
                ++undefined;
                if (ref.isArray) console.log(`ERROR: Undefined temporal pol ${name}[${index}]`)
                else console.log(`ERROR: Undefined temporal pol ${name}`)
                if (reported) continue;
                names.push(name);
                reported = true;
            }
        }
        if (undefined > 0) {
            throw new Error(`found ${undefined} undefined pols (${names.join(',')})`);
        }
    }
    checkUnusedExpressions() {
        for (const expr of this.expressions) {
            if (!expr.used) {
                console.log(expr);
                if (this.config.disableUnusedError) {
                    console.log(`WARNING: Unused expresion ${expr.poldef} on ${expr.fileName}:${expr.first_line}`);
                } else {
                    this.error(expr, `Unused expression ${expr.poldef} `);
                }
            }
            if (expr.deg>2) {
                this.error(expr, `Degree ${expr.deg} greater than 2`);
            }
        }
    }
    checkExpressionsDegree(limit=2) {
        for (const expr of this.expressions) {
            if (expr.deg <= limit) continue;
            this.error(expr, `Degree ${expr.deg} greater than ${limit}`);
        }
    }
    getFullName(e) {
        if (e.name === 'ELSE_ADDR') {
            console.log(['E', e, this.namespace, this.subproof]);
        }
        const ns = (((e.namespace ?? 'this') === 'this') ? this.namespace : e.namespace);
        const sp = e.subproof ? e.subproof : this.subproof;

        let name = '';
        if (sp !== '') {
            name += sp + '::';
        }
        if (ns !== '') {
            name += ns + '.';
        }
        name += e.name;
        console.log(`${e.name} ==> ${name}`)
        return name;
    }
    asString(s) {
        if (typeof s === 'string') return s;
        if (typeof s === 'bigint') return ''+s;
        if (typeof s.type === 'string') {
            return s.value;
        }
        if (typeof s.type === 'template') {
            // TODO: resolve template ???
            return s.value;
        }
        this.error(s, "invalid string");
    }
}

module.exports = async function compile(Fr, fileName, ctx, config = {}) {

    let compiler = new Compiler(Fr);
    return await compiler.compile(fileName, config);
}
