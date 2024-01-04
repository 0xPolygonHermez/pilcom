const path = require("path");
const fs = require("fs");
const pil_parser = require("../build/pil_parser.js");
const { check } = require("yargs");
const Scalar = require("ffjavascript").Scalar;

const oldParseError = pil_parser.Parser.prototype.parseError;

class SkipNamespace extends Error {
    constructor(namespace, name = false) {
        super(name ? `Pol ${namespace}.${name} must be skipped` : `Namespace ${namespace} must be skipped`);
        this.namespace = namespace;
        this.name = name;
    }
}

module.exports = async function compile(Fr, fileName, ctx, config = {}) {

    const ansiColor = config.color ? (x) => '\x1b['+x+'m' : (x) => '';

    let isMain;
    if (!ctx) {
        ctx = {
            references: {},
            publics:{},
            nCommitments: 0,
            nConstants: 0,
            nIm: 0,
            nQ: 0,
            nPublic: 0,
            expressions: [],
            polIdentities: [],
            plookupIdentities: [],
            permutationIdentities: [],
            connectionIdentities: [],
            namespace: "Global",
            constants: {},
            Fr: Fr,
            includedFiles: {},
            config,
            namespaces: true,
            skippedNamespaces: {},
            skippedPols: {},
            includePaths: (config && config.includePaths) ? (Array.isArray(config.includePaths) ? config.includePaths: [config.includePaths]): []
        }
        isMain = true;
    } else {
        isMain = false;
    }

    /* config example:

        {
            disableUnusedError: true,
            namespaces: ['Main', 'Global', 'Rom'],
            defines: { N: 2 ** 18 }
        }

    */

    let fullFileName, fileDir, src;
    let includePathIndex = 0;
    let relativeFileName = '';

    if (isMain && config && config.compileFromString) {
        relativeFileName = fullFileName = "(string)";
        fileDir = '';
        src = fileName;
    }
    else {
        includePaths = [...ctx.includePaths];
        const cwd = ctx.cwd ? ctx.cwd : process.cwd();

        if (config && config.includePathFirst) {
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

        if (includePathIndex != directIncludePathIndex) {
            relativeFileName = fileName;
        }
        fileDir = path.dirname(fullFileName);
        src = await fs.promises.readFile(fullFileName, "utf8") + "\n";
    }
    const srcLines = src.split(/(?:\r\n|\n|\r)/);

    const myErr = function (str, hash) {
        str = fullFileName + " -> " + str;
        oldParseError(str, hash);
    };
    pil_parser.Parser.prototype.parseError = myErr;

    const parser = new pil_parser.Parser();
    const sts = parser.parse(src);

    let pendingCommands = [];
    let lastLineAllowsCommand = false;

    if (isMain && config && config.namespaces) {
        ctx.namespaces = {};
        for (const name of config.namespaces) {
            ctx.namespaces[name] = 0;
        }
    }

    if (isMain && config && config.defines && typeof config.defines === 'object') {
        for (const name in config.defines) {
            ctx.constants[name] = BigInt(config.defines[name]);
        }
    }

    if (relativeFileName === '') {
        if (isMain) {
            relativeFileName = path.basename(fullFileName);
            ctx.basePath = fileDir;
        } else {
            if (fullFileName.startsWith(ctx.basePath)) {
                relativeFileName = fullFileName.substring(ctx.basePath.length+1);
            } else {
                relativeFileName = fullFileName;
            }
        }
    }

    for (let i=0; i<sts.length; i++) {
        const s = sts[i];
        ctx.fileName = s.fileName = relativeFileName;
        ctx.line = s.first_line;

        if (s.type == "INCLUDE") {
            const fullFileNameI = config.includePaths ? s.file : path.resolve(fileDir, s.file);
            if (!ctx.includedFiles[fullFileNameI]) {       // If a file included twice just ignore
                ctx.includedFiles[fullFileNameI] = true;
                const oldNamespace = ctx.namespace;
                ctx.namespace = "Global";
                const oldCwd = ctx.cwd;
                ctx.cwd = fileDir;
                await compile(Fr, fullFileNameI, ctx, config);
                ctx.cwd = oldCwd;
                ctx.namespace = oldNamespace;
                if (pendingCommands.length>0) error(s, "command not allowed before include");
                lastLineAllowsCommand = false;
            }
            continue;
        } else if (s.type == "NAMESPACE") {
            ctx.namespace = s.namespace;
            const se = simplifyExpression(Fr, ctx, s.exp);
            if (se.op != "number") error(s, "Size is not constant expression");
            ctx.polDeg = Number(se.value);
            continue;
        }

        let skip = false;
        let poldef = false;
        let insideIncludedDomain = false;
        const ctxExprLen = ctx.expressions.length;

        try {
            checkNamespace(ctx.namespace, ctx);
            insideIncludedDomain = true;
            if (s.type == "POLCOMMTDECLARATION") {
                for (let j=0; j<s.names.length; j++) {
                    if (ctx.references[ctx.namespace + "." + s.names[j].name]) error(s, `name already defined ${ctx.namespace + "." +s.names[j]}`);
                    if  (s.names[j].type == "array") {
                        const se = simplifyExpression(Fr, ctx, s.names[j].expLen);
                        if (se.op != "number") error(s, "Array Size is not constant expression");
                        ctx.references[ctx.namespace + "." + s.names[j].name] = {
                            type: "cmP",
                            id: ctx.nCommitments,
                            polDeg: ctx.polDeg,
                            isArray: true,
                            len: Number(se.value)
                        }
                        ctx.nCommitments += Number(se.value);
                    } else {
                        ctx.references[ctx.namespace + "." + s.names[j].name] = {
                            type: "cmP",
                            id: ctx.nCommitments,
                            polDeg: ctx.polDeg,
                            isArray: false,
                        }
                        ctx.nCommitments += 1;
                    }
                }
            } else if (s.type == "POLCONSTANTDECLARATION") {
                for (let j=0; j<s.names.length; j++) {
                    if (ctx.references[ctx.namespace + "." + s.names[j].name]) error(s, `name already defined ${ctx.namespace + "." + s.names[j]}`);
                    if  (s.names[j].type == "array") {
                        const se = simplifyExpression(Fr, ctx, s.names[j].expLen);
                        if (se.op != "number") error(s, "Array Size is not constant expression");
                        ctx.references[ctx.namespace + "." + s.names[j].name] = {
                            type: "constP",
                            id: ctx.nConstants,
                            polDeg: ctx.polDeg,
                            isArray: true,
                            len: Number(se.value)
                        }
                        ctx.nConstants += Number(se.value);
                    } else {
                        ctx.references[ctx.namespace + "." + s.names[j].name] = {
                            type: "constP",
                            id: ctx.nConstants,
                            polDeg: ctx.polDeg,
                            isArray: false,
                        }
                        ctx.nConstants += 1;
                    }
                }
            } else if (s.type == "POLDEFINITION") {
                poldef = ctx.namespace + "." + s.name;
                const eidx = ctx.expressions.length;
                s.expression.poldef = poldef;
                addFilename(s.expression, relativeFileName, ctx);
                ctx.expressions.push(s.expression);
                if (ctx.references[ctx.namespace + "." + s.name]) error(s, `name already defined ${ctx.namespace + "." + s.name}`);
                ctx.references[ctx.namespace + "." + s.name] = {
                    type: "imP",
                    id: eidx,
                    polDeg: ctx.polDeg
                }
                ctx.nIm++;
            } else if (s.type == "POLIDENTITY") {
                const eidx = ctx.expressions.length;
                addFilename(s.expression, relativeFileName, ctx);
                ctx.expressions.push(s.expression);
                ctx.polIdentities.push({fileName: relativeFileName, namespace: ctx.namespace, line: s.first_line, e: eidx});
            } else if (s.type == "PLOOKUPIDENTITY" || s.type == "PERMUTATIONIDENTITY") {
                const pu = {
                    fileName: relativeFileName,
                    namespace: ctx.namespace,
                    line: s.first_line,
                    f: [],
                    t: [],
                    selF: null,
                    selT: null
                }
                for (let j=0; j<s.f.length; j++) {
                    const efidx = ctx.expressions.length;
                    addFilename(s.f[j], relativeFileName, ctx);
                    ctx.expressions.push(s.f[j]);
                    pu.f.push(efidx);
                }
                if (s.selF) {
                    const selFidx = ctx.expressions.length;
                    addFilename(s.selF, relativeFileName, ctx);
                    ctx.expressions.push(s.selF);
                    pu.selF = selFidx;
                }
                for (let j=0; j<s.t.length; j++) {
                    const etidx = ctx.expressions.length;
                    addFilename(s.t[j], relativeFileName, ctx);
                    ctx.expressions.push(s.t[j]);
                    pu.t.push(etidx);
                }
                if (s.selT) {
                    const selTidx = ctx.expressions.length;
                    addFilename(s.selT, relativeFileName, ctx);
                    ctx.expressions.push(s.selT);
                    pu.selT = selTidx;
                }
                if (pu.f.length != pu.t.length ) error(s, `${s.type} with different number of elements`);
                if (s.type == "PLOOKUPIDENTITY") {
                    ctx.plookupIdentities.push(pu);
                } else {
                    ctx.permutationIdentities.push(pu);
                }
            } else if (s.type == "CONNECTIONIDENTITY") {
                const ci = {
                    fileName: relativeFileName,
                    namespace: ctx.namespace,
                    line: s.first_line,
                    pols: [],
                    connections: [],
                }
                for (let j=0; j<s.pols.length; j++) {
                    const efidx = ctx.expressions.length;
                    addFilename(s.pols[j], relativeFileName, ctx);
                    ctx.expressions.push(s.pols[j]);
                    ci.pols.push(efidx);
                }
                for (let j=0; j<s.connections.length; j++) {
                    const etidx = ctx.expressions.length;
                    addFilename(s.connections[j], relativeFileName, ctx);
                    ctx.expressions.push(s.connections[j]);
                    ci.connections.push(etidx);
                }
                if (ci.pols.length != ci.connections.length ) error(s, `connection with different number of elements`);
                ctx.connectionIdentities.push(ci);
            } else if (s.type == "PUBLICDECLARATION") {
                if (ctx.publics[s.name]) error(s, `name already defined ${s.name}`);
                let ns = s.pol.namespace;
                if (ns == "this") ns = ctx.namespace;
                if (typeof ctx.references[ns + "." + s.pol.name] == "undefined" ) error(s, `polyomial not defined ${ns + "." +s.pol.name}`);
                if ((s.pol.idxExp) && (!ctx.references[ns + "." + s.pol.name].isArray)) error(s, `${ns + "." + s.pol.name} is not an Array`);
                if ((!s.pol.idxExp) && (ctx.references[ns + "." + s.pol.name].isArray)) error(s, `${ns + "." + s.pol.name}: index of an array not specified`);
                let offset;
                if ((s.pol.idxExp) && (ctx.references[ns + "." + s.pol.name].isArray)) {
                    const se = simplifyExpression(Fr, ctx, s.pol.idxExp);
                    if (se.op != "number") error(s, "Index is not constant expression");
                    offset = Number(se.value);
                } else {
                    offset = 0;
                }
                const se = simplifyExpression(Fr, ctx, s.idx);
                if (se.op != "number") error(s, "Index of a public is not constant expression");
                ctx.publics[s.name] = {
                    polType: ctx.references[ns + "." + s.pol.name].type,
                    polId: Number(ctx.references[ns + "." + s.pol.name].id) + offset,
                    idx: Number(se.value),
                    id: ctx.nPublic++
                };
            } else if (s.type == "CONSTANTDEF") {
                if (ctx.config && ctx.config.defines && typeof ctx.config.defines[s.name] !== 'undefined') {
                    console.log(`NOTICE: Ignore constant definition ${s.name} on ${relativeFileName}:${s.first_line} because it was pre-defined`);
                } else {
                    if (ctx.constants[s.name]) error(s, `name already defined ${s.name}`);
                    const se = simplifyExpression(Fr, ctx, s.exp);
                    if (se.op != "number") error(s, "Not a constant expression");
                    ctx.constants[s.name] = se.value;
                }
            } else {
                error(s, `Invalid line type: ${s.type}`);
            }
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
            if (config.verbose) {
                verboseInfo = ':\n' + ansiColor(36) + srcLines.slice(s.first_line-1, Math.min(s.first_line+3, s.last_line)).join('\n');
                const lineStrLines = s.last_line - s.first_line + 1;
                if (lineStrLines > 3) verboseInfo += " ...";
                verboseInfo += ansiColor(0) +'\n';
            }
            console.log(`NOTE: ${relativeFileName}:${s.first_line} was ignored${verboseInfo}`);
        }

        if (poldef) {
            console.log(`adding ${poldef} to exclude`);
            ctx.skippedPols[poldef] = true;
        }
        while (ctxExprLen < ctx.expressions.length) {
            ctx.expressions.pop();
        }
    }

    if (isMain) {
        if (typeof ctx.namespaces === 'object') {
            let notFoundNamespaces = Object.keys(ctx.namespaces).filter(namespace => ctx.namespaces[namespace] === 0);
            if (notFoundNamespaces.length) {
                throw new Error('ERROR: namespaces not found: '+notFoundNamespaces.join(', '));
            }
        }

        for (n in ctx.publics) {
            if (ctx.publics.hasOwnProperty(n)) {
                const pub = ctx.publics[n];
                if (pub.polType == "imP") {
                    ctx.expressions[pub.polId] = simplifyExpression(Fr, ctx, ctx.expressions[pub.polId] );
                }
            }
        }
        for (let i=0; i<ctx.polIdentities.length; i++) {
            ctx.namespace = ctx.polIdentities[i].namespace;
            ctx.expressions[ctx.polIdentities[i].e] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.polIdentities[i].e]);
        }
        for (let i=0; i<ctx.plookupIdentities.length; i++) {
            ctx.namespace = ctx.plookupIdentities[i].namespace;
            for (j=0; j<ctx.plookupIdentities[i].f.length; j++) {
                ctx.expressions[ctx.plookupIdentities[i].f[j]] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].f[j]]);
            }
            if (ctx.plookupIdentities[i].selF !== null) {
                ctx.expressions[ctx.plookupIdentities[i].selF] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].selF]);
            }
            for (j=0; j<ctx.plookupIdentities[i].t.length; j++) {
                ctx.expressions[ctx.plookupIdentities[i].t[j]] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].t[j]]);
            }
            if (ctx.plookupIdentities[i].selT !== null) {
                ctx.expressions[ctx.plookupIdentities[i].selT] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].selT]);
            }
        }
        for (let i=0; i<ctx.permutationIdentities.length; i++) {
            ctx.namespace = ctx.permutationIdentities[i].namespace;
            for (j=0; j<ctx.permutationIdentities[i].f.length; j++) {
                ctx.expressions[ctx.permutationIdentities[i].f[j]] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.permutationIdentities[i].f[j]]);
            }
            if (ctx.permutationIdentities[i].selF !== null) {
                ctx.expressions[ctx.permutationIdentities[i].selF] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.permutationIdentities[i].selF]);
            }
            for (j=0; j<ctx.permutationIdentities[i].t.length; j++) {
                ctx.expressions[ctx.permutationIdentities[i].t[j]] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.permutationIdentities[i].t[j]]);
            }
            if (ctx.permutationIdentities[i].selT !== null) {
                ctx.expressions[ctx.permutationIdentities[i].selT] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.permutationIdentities[i].selT]);
            }
        }
        for (let i=0; i<ctx.connectionIdentities.length; i++) {
            ctx.namespace = ctx.connectionIdentities[i].namespace;
            for (j=0; j<ctx.connectionIdentities[i].pols.length; j++) {
                ctx.expressions[ctx.connectionIdentities[i].pols[j]] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.connectionIdentities[i].pols[j]]);
            }
            for (j=0; j<ctx.connectionIdentities[i].connections.length; j++) {
                ctx.expressions[ctx.connectionIdentities[i].connections[j]] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.connectionIdentities[i].connections[j]]);
            }
        }

        for (let i=0; i<ctx.expressions.length; i++) {
            if (!ctx.expressions[i].simplified) {
                if (ctx.config.disableUnusedError) {
                    console.log(`WARNING: Unused expression ${ctx.expressions[i].poldef || i} on ${ctx.expressions[i].fileName}:${ctx.expressions[i].first_line}`);
                } else {
                    error(ctx.expressions[i], `Unused expression ${ctx.expressions[i].poldef || i} `);
                }
            }
            if (!ctx.expressions[i].deg>2) error(ctx.expressions[i], "Degree greater than 2");
        }
        for (let i=0; i<ctx.polIdentities.length; i++) {
            reduceto2(ctx, ctx.expressions[ctx.polIdentities[i].e]);
        }
        for (let i=0; i<ctx.plookupIdentities.length; i++) {
            for (j=0; j<ctx.plookupIdentities[i].f.length; j++) {
                reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].f[j]]);
            }
            if (ctx.plookupIdentities[i].selF) {
                reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].selF]);
            }
            for (j=0; j<ctx.plookupIdentities[i].t.length; j++) {
                reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].t[j]]);
            }
            if (ctx.plookupIdentities[i].selT) {
                reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].selT]);
            }
        }
        for (let i=0; i<ctx.permutationIdentities.length; i++) {
            for (j=0; j<ctx.permutationIdentities[i].f.length; j++) {
                reduceto1(ctx, ctx.expressions[ctx.permutationIdentities[i].f[j]]);
            }
            if (ctx.permutationIdentities[i].selF) {
                reduceto1(ctx, ctx.expressions[ctx.permutationIdentities[i].selF]);
            }
            for (j=0; j<ctx.permutationIdentities[i].t.length; j++) {
                reduceto1(ctx, ctx.expressions[ctx.permutationIdentities[i].t[j]]);
            }
            if (ctx.permutationIdentities[i].selT) {
                reduceto1(ctx, ctx.expressions[ctx.permutationIdentities[i].selT]);
            }
        }
        for (let i=0; i<ctx.connectionIdentities.length; i++) {
            for (j=0; j<ctx.connectionIdentities[i].pols.length; j++) {
                reduceto1(ctx, ctx.expressions[ctx.connectionIdentities[i].pols[j]]);
            }
            for (j=0; j<ctx.connectionIdentities[i].connections.length; j++) {
                reduceto1(ctx, ctx.expressions[ctx.connectionIdentities[i].connections[j]]);
            }
        }
    }

    if (isMain) {
        return ctx2json(ctx);
    }
}

function error(l, err) {
    if (err instanceof Error) {
        err.message = `ERROR ${l.fileName}:${l.first_line}: ${err.message}`
        throw(err);
    } else {
        const msg = `ERROR ${l.fileName}:${l.first_line}: ${err}`;
        throw new Error(msg);
    }
}

function simplifyExpression(Fr, ctx, e) {
    if (e.simplified) return e;
    e.simplified = true;
    if (e.namespace) checkNamespace(e.namespace, ctx);
    if (e.op == "pol") {
        const ref = ctx.references[e.namespace + '.' + e.name];
        if (!ref) error(e, `polynomial ${e.namespace + '.' + e.name} not defined`);
        if ((ref.type == "cmP") || (ref.type == "constP")) {
            e.deg = 1;
        } else if (ref.type == "imP") {
            ctx.expressions[ref.id] = simplifyExpression(Fr, ctx, ctx.expressions[ref.id]);
            reduceto1(ctx, ctx.expressions[ref.id]);
            e.deg = 1;
        } else {
            throw new Error(`Invalid reference type: ${ref.type}`);
        }
        return e;
    }
    if (e.op == "number") {
        e.deg = 0;
        return e;
    }
    if (e.op == "public") {
        const ref = ctx.publics[e.name];
        if (!ref) error(e, `public ${e.name} not defined`);
        e.id = ref.id;
        e.deg = 0;
        return e;
    }
    if (e.op == "neg") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        if (a.op == "number") {
            return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.neg(Fr.e(a.value))), first_line: e.first_line}
        } else {
            e.deg = a.deg;
            return e;
        }
    }
    if (e.op == "add") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        e.values[1] = simplifyExpression(Fr, ctx, e.values[1]);
        const b = e.values[1];
        if ((a.op == "number") && (b.op == "number")) {
            return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.add(Fr.e(a.value), Fr.e(b.value))), first_line: e.first_line}
        }
        e.deg = Math.max(a.deg, b.deg);
        return e;
    }
    if (e.op == "sub") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        e.values[1] = simplifyExpression(Fr, ctx, e.values[1]);
        const b = e.values[1];
        if ((a.op == "number") && (b.op == "number")) {
            return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.sub(Fr.e(a.value), Fr.e(b.value))), first_line: e.first_line}
        }
        e.deg = Math.max(a.deg, b.deg);
        return e;
    }
    if (e.op == "mul") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        e.values[1] = simplifyExpression(Fr, ctx, e.values[1]);
        const b = e.values[1];
        if ((a.op == "number") && (b.op == "number")) {
            return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.mul(Fr.e(a.value), Fr.e(b.value))), first_line: e.first_line}
        }
        e.deg = a.deg +  b.deg;
        return e;
    }
    if (e.op == "pow") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        e.values[1] = simplifyExpression(Fr, ctx, e.values[1]);
        const b = e.values[1];
        if ((a.op == "number") && (b.op == "number")) {
            return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.exp(Fr.e(a.value), Scalar.e(b.value))), first_line: e.first_line}
        } else {
            error(e, "Exponentiation can only be applied between constants");
        }
    }
    if (e.op == "constant") {
        return {simplified:true, op: "number", deg:0, value: ctx.constants[e.name]};
    }

    error(e, `invalid operation: ${e.op}`);
}

function addFilename(exp, fileName, ctx) {
    exp.fileName = fileName;
    if (exp.namespace === "this") exp.namespace = ctx.namespace;
    else if (exp.namespace) checkNamespace(exp.namespace, ctx);

    if (exp.name) checkSkippedPols(exp.namespace, exp.name, ctx);
    if (exp.values) {
        for(let i=0; i<exp.values.length; i++) addFilename(exp.values[i], fileName, ctx);
    }
}

function checkNamespace (namespace, ctx, exceptionToSkip = true) {
    if (!namespace || ctx.namespaces === true) return true;
    if (typeof ctx.namespaces[namespace] !== 'undefined') {
        ++ctx.namespaces[namespace];
        return true;
    }
    if (!ctx.skippedNamespaces[namespace]) {
        ctx.skippedNamespaces[namespace] = 0;
        console.log(`NOTE: namespace ${namespace} was ignored`);
    }
    ++ctx.skippedNamespaces[namespace];
    if (exceptionToSkip) {
        throw new SkipNamespace(namespace);
    }
    return false;
}

function checkSkippedPols (namespace, name, ctx, exceptionToSkip = true) {
    if (ctx.namespaces === true) return true;
    if (!ctx.skippedPols[namespace + '.' + name]) return true;
    if (exceptionToSkip) {
        throw new SkipNamespace(namespace, name);
    }
    return false;
}

function reduceto2(ctx, e) {
    if (e.deg>2) error(e, "Degre too high");
}

function reduceto1(ctx, e) {
    if (e.deg<=1) return;
    if (e.deg>2) error(e, "Degre too high");
    e.idQ = ctx.nQ++
    e.deg = 1;
}

// Commitmets
// Qs
// Const
// Im


function ctx2json(ctx) {
    const out={
        nCommitments: ctx.nCommitments,
        nQ: ctx.nQ,
        nIm: ctx.nIm,
        nConstants: ctx.nConstants,
        publics: [],
        references: {},
        expressions: [],
        polIdentities: [],
        plookupIdentities: [],
        permutationIdentities: [],
        connectionIdentities: []
    };

    for (n in ctx.references) {
        if (ctx.references.hasOwnProperty(n)) {
            const ref = ctx.references[n];
            if (ref.isArray) {
                out.references[n] = {
                    type: ref.type,
                    id: ref.id,
                    polDeg: ref.polDeg,
                    isArray: true,
                    len: ref.len
                };
            } else {
                out.references[n] = {
                    type: ref.type,
                    id: ref.id,
                    polDeg: ref.polDeg,
                    isArray: false
                };
            }
        }
    }

    for (n in ctx.publics) {
        if (ctx.publics.hasOwnProperty(n)) {
            const pub = ctx.publics[n];
            out.publics[pub.id] = pub;
            out.publics[pub.id].name = n;
        }
    }

    for (let i=0; i<ctx.expressions.length; i++) {
        out.expressions.push(expression2JSON(ctx, ctx.expressions[i]));
    }

    for (let i=0; i<ctx.polIdentities.length; i++) {
        out.polIdentities.push({
            e: ctx.polIdentities[i].e,
            fileName: ctx.polIdentities[i].fileName,
            line: ctx.polIdentities[i].line
        });
    }

    for (let i=0; i<ctx.plookupIdentities.length; i++) {
        const pu = {};
        pu.f = ctx.plookupIdentities[i].f;
        pu.t = ctx.plookupIdentities[i].t;
        pu.selF = ctx.plookupIdentities[i].selF;
        pu.selT = ctx.plookupIdentities[i].selT;
        pu.fileName = ctx.plookupIdentities[i].fileName;
        pu.line = ctx.plookupIdentities[i].line;
        out.plookupIdentities.push(pu);
    }

    for (let i=0; i<ctx.permutationIdentities.length; i++) {
        const pu = {};
        pu.f = ctx.permutationIdentities[i].f;
        pu.t = ctx.permutationIdentities[i].t;
        pu.selF = ctx.permutationIdentities[i].selF;
        pu.selT = ctx.permutationIdentities[i].selT;
        pu.fileName = ctx.permutationIdentities[i].fileName;
        pu.line = ctx.permutationIdentities[i].line;
        out.permutationIdentities.push(pu);
    }

    for (let i=0; i<ctx.connectionIdentities.length; i++) {
        const pu = {};
        pu.pols = ctx.connectionIdentities[i].pols;
        pu.connections = ctx.connectionIdentities[i].connections;
        pu.fileName = ctx.connectionIdentities[i].fileName;
        pu.line = ctx.connectionIdentities[i].line;
        out.connectionIdentities.push(pu);
    }

    return out;
}

function expression2JSON(ctx, e, deps) {
    let main = false;
    if (!deps) {
        deps = [];
        main = true;
    }
    const out = {
        op: e.op
    }
    out.deg = e.deg;
    if (e.op == "pol") {
        const ref = ctx.references[e.namespace + '.' + e.name];
        if (!ref) error(e,  `${e.namespace + "." + e.name} reference not defned`);
        if ((e.idxExp) && (!ctx.references[e.namespace + "." + e.name].isArray)) error(e, `${e.namespace + "." + e.name} is not an Array`);
        if ((!e.idxExp) && (ctx.references[e.namespace + "." + e.name].isArray)) error(e, `${e.namespace + "." + e.name}: index of an array not specified`);
        let offset;
        if ((e.idxExp) && (ctx.references[e.namespace + "." + e.name].isArray)) {
            const se = simplifyExpression(ctx.Fr, ctx, e.idxExp);
            if (se.op != "number") error(e, "Index is not constant expression");
            offset = Number(se.value);
        } else {
            offset = 0;
        }
        if (ref.type=="cmP") {
            out.id = Number(ref.id)+offset;
            out.op = "cm";
        } else if (ref.type=="constP") {
            out.id = Number(ref.id)+offset;
            out.op = "const"
        } else if (ref.type=="imP") {
            if (offset != 0) error(e, "Intermediate cannot have an offset")
            if (!main) {
                deps.push(ref.id);
            }
            out.id = ref.id;
            out.op = "exp"
        }
        out.next = e.next;
    }
    if (e.op == "public") {
        const ref = ctx.publics[e.name];
        out.id = ref.id;
        out.op = "public";
    }
    if (typeof e.idQ != "undefined") out.idQ = e.idQ;
    if (typeof e.values != "undefined") {
        out.values = [];
        for (let i=0; i<e.values.length; i++) {
            out.values.push( expression2JSON(ctx, e.values[i], deps));
        }
    }
    if (typeof e.value !== "undefined") {
        out.value = e.value;
    }
    if (typeof e.const !== "undefined") {
        out.const = e.const;
    }
    if ((main)&&(deps.length>0)) out.deps = deps;
    return out;
}
