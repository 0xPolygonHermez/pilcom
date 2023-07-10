const {assert} = require("chai");
const Scope = require("./scope.js");
const Expressions = require("./expressions.js");
const Expression = require("./expression.js");
const Definitions = require("./definitions.js");
const References = require("./references.js");
const Indexable = require("./indexable.js");
const Ids = require("./ids.js");
const Constraints = require("./constraints.js");
const Subproofs = require("./subproofs.js");
const Variables = require("./variables.js");
const Sequence = require("./sequence.js");
const List = require("./list.js");
const Assign = require("./assign.js");
const Function = require("./function.js");
const PackedExpressions = require("./packed_expressions.js");
const ProtoOut = require("./proto_out.js");
const FixedCols = require("./fixed_cols.js");
const WitnessCols = require("./witness_cols.js");
const Iterator = require("./iterator.js");
const Context = require("./context.js");
const {FlowAbortCmd, BreakCmd, ContinueCmd, ReturnCmd} = require("./flow_cmd.js")
const fs = require('fs');

module.exports = class Processor {
    constructor (Fr, parent, references, expressions) {
        this.compiler = parent;
        this.trace = false;
        this.Fr = Fr;
        this.context = new Context(this.Fr);
        this.scope = new Scope(this.Fr);
        this.references = new References(Fr, this.context, this.scope);

        this.ints = new Variables(Fr, 'int');
        this.references.register('int', this.ints);

        this.fes = new Variables(Fr, 'fe');
        this.references.register('fe', this.fes);

        this.vexprs = new Variables(Fr, 'expr');
        this.references.register('expr', this.vexprs);

        this.lexprs = new Variables(Fr, 'lexpr');
        this.references.register('lexpr', this.lexprs);

        this.fixeds = new FixedCols(Fr);
        this.fixeds.runtimeRows = true;
        this.references.register('fixed', this.fixeds);

        this.witness = new WitnessCols(Fr);
        this.references.register('witness', this.witness);

        this.constants = new Indexable(Fr, 'constant', 'int');
        this.references.register('constant', this.constants);

        this.publics = new Ids('public');
        this.references.register('public', this.publics);

        this.challenges = new Ids('challenge');
        this.references.register('challenge', this.challenges);

        this.prover = new Ids('prover');
        this.references.register('prover', this.prover);

//        this.imCols = new Indexable(Fr, 'im');
//        this.references.register('im', this.imCols);

        this.functions = new Indexable(Fr, 'function');
        this.references.register('function', this.functions);

        this.subproofs = new Subproofs(Fr);

        this.expressions = new Expressions(Fr, this, this.references, this.publics, this.constants);
        this.globalExpressions = new Expressions(Fr, this, this.references, this.publics, this.constants);

        this.references.register('im', this.expressions);

        this.constraints = new Constraints(Fr, this.expressions);
        this.globalConstraints = new Constraints(Fr, this.globalExpressions);

        this.assign = new Assign(Fr, this, this.references, this.expressions);

        this.executeCounter = 0;
        this.executeStatementCounter = 0;
        this.functionDeep = 0;
        this.callstack = []; // TODO
        this.breakpoints = ['expr.pil:26'];
        this.loadBuiltInClass();
    }
    loadBuiltInClass() {
        const filenames = fs.readdirSync(__dirname + '/builtin');
        this.builtIn = {};
        for (const filename of filenames) {
            if (!filename.endsWith('.js')) continue;
            console.log(`Loading builtin ${filename}.....`);
            const builtInCls = require(__dirname + '/builtin/'+ filename);
            const builtInObj = new builtInCls(this);
            this.builtIn[builtInObj.name] = builtInObj;
        }
    }
    insideFunction() {
        return this.functionDeep > 0;
    }
    startExecution(statements) {
        this.references.declare('N', 'int', [], { global: true, sourceRef: this.sourceRef });
        console.log(statements);
        this.execute(statements);
    }
    generateOut()
    {
        let packed = new PackedExpressions();
        this.expressions.pack(packed);
        //packed.dump();
        this.constraints.dump(packed);
        this.fixeds.dump();

        let proto = new ProtoOut(this.Fr);
        proto.setupPilOut('myFirstPil', this.publics);
        proto.setProof('myFirstProof', this.rows);
        proto.setFixedCols(this.fixeds);
        proto.setPeriodicCols(this.fixeds);
        proto.setConstraints(this.constraints, packed);
        proto.setWitnessCols(this.witness);
        proto.setExpressions(packed);
        proto.setReferences(this.references);
        proto.encode();
        proto.saveToFile('tmp/pilout.ptb');
        // stageWidths
        // expressions

        // publics
        // this.imCols.dump();
    }
    traceLog(text, color = '') {
        if (!this.trace) return;
        if (color) console.log(`\x1B[${color}m${text}\x1B[0m`);
        else console.log(text);
    }
    execute(statements, label = '') {
        const __executeCounter = this.executeCounter++;
        const lstatements = Array.isArray(statements) ? statements : [statements];
        // console.log(`## DEBUG ## ${this.executeCounter}[${lstatements.length}]`)
        // console.log(`\x1B[45m====> ${lstatements[0].type}\x1B[0m`);
        const firstBlockStatement = lstatements.length > 0 ? lstatements[0] : {debug:''};
        let __label = label ? label : (firstBlockStatement.debug ?? '');
        this.traceLog(`[TRACE-BLOCK] #${__executeCounter} ${__label} (DEEP:${this.scope.deep})`, '38;5;51');
        for (const st of lstatements) {
            const result = this.executeStatement(st);
            if (result instanceof FlowAbortCmd) {
                __label = label ? label : (st.debug ?? '');
                this.traceLog(`[TRACE-ABORT::${result.constructor.name}#${result.id}] #${__executeCounter} ${__label} (DEEP:${this.scope.deep})`,'38;5;51;48;5;16');
                return result;
            }
        }
    }
    executeStatement(st) {
        const __executeStatementCounter = this.executeStatementCounter++;
        this.traceLog(`[TRACE] #${__executeStatementCounter} ${st.debug ?? ''} (DEEP:${this.scope.deep})`, '38;5;75');

        this.sourceRef = st.debug ?? '';

        if (typeof st.type === 'undefined') {
            console.log(st);
            this.error(st, `Invalid statement (without type)`);
        }
        // console.log(`## DEBUG ## ${this.executeCounter}.${this.executeStatementCounter} ${st.debug}` );
        const method = ('exec_'+st.type).replace(/[-_][a-z]/g, (group) => group.slice(-1).toUpperCase());
        if (!(method in this)) {
            console.log('==== ERROR ====');
                this.error(st, `Invalid statement type: ${st.type}`);
        }
        let res;
        try {
            if (this.breakpoints.includes(st.debug)) {
                debugger;
            }
            res = this[method](st);
        } catch (e) {
            console.log("EXCEPTION ON "+st.debug+" ("+this.callstack.join(' > ')+")");
            throw e;
        }
        return res;
    }
    execProof(st) {
        this.scope.pushInstanceType('proof');
        this.execute(st.statements);
        this.scope.popInstanceType();
    }
    execCall(st) {
        const name = st.function.name;
        const func = this.builtIn[name] ?? (this.references.getTypedValue(name) || {}).value;

        if (func) {
            this.callstack.push(st.debug);
            ++this.functionDeep;
            this.scope.push();
            const mapInfo = func.mapArguments(st);
            this.references.pushVisibilityScope();
            const res = func.exec(st, mapInfo);
            this.references.popVisibilityScope();
            this.scope.pop();
            --this.functionDeep;
            this.callstack.pop();
            return res;
        }
        this.error(st, `Undefined function statement type: ${name}`);
    }
    execAssign(st) {
        // type: number(int), fe, string, col, challenge, public, prover,
        // dimensions:
        // TODO: move to assign class
        const indexes = this.decodeIndexes(st.name.indexes)
        const names = this.context.getNames(st.name.name);
        if (st.name.reference) {
            assert(indexes.length === 0);
            this.assign.assignReference(names, st.value.instance());
            return;
        }
        this.assign.assign(names, indexes, st.value);
        // this.references.set(st.name.name, [], this.expressions.eval(st.value));
    }
    execIf(s) {
        for (let icond = 0; icond < s.conditions.length; ++icond) {
            const cond = s.conditions[icond];
            if ((icond === 0) !== (cond.type === 'if')) {
                throw new Exception('first position must be an if, and if only could be on first position');
            }
            if (cond.type === 'else' && icond !== (s.conditions.length-1)) {
                throw new Exception('else only could be on last position');
            }

            if (typeof cond.expression !== 'undefined' && this.expressions.e2bool(cond.expression) !== true) {
                continue;
            }
            this.scope.push();
            const res = this.execute(cond.statements, `IF ${this.sourceRef}`);
            this.scope.pop();
            return res;
        }
    }
    execWhile(s) {
        let index = 0;
        while (this.expressions.e2bool(s.condition)) {
            this.scope.push();
            this.execute(s.statements, `WHILE ${this.sourceRef} I:${index}`);
            ++index;
            this.scope.pop();
            if (res === false) break;
        }
    }
    execScopeDefinition(s) {
        this.scope.push();
        const result = this.execute(s.statements, `SCOPE ${this.sourceRef}`);
        this.scope.pop();
        return result;
    }
    execFor(s) {
        let result;
        this.scope.push();
        this.execute(s.init, `FOR ${this.sourceRef} INIT`);
        let index = 0;
        while (this.expressions.e2bool(s.condition)) {
            // if only one statement, scope will not create.
            // if more than one statement, means a scope_definition => scope creation
            result = this.execute(s.statements, `FOR ${this.sourceRef} I:${index}`);
            ++index;
            if (result instanceof BreakCmd) break;
            this.execute(s.increment);
        }
        this.scope.pop();
/*
        while (this.expressions.e2value(s.condition)) {
            this.scope.push();
            this.parent.parseStatments(s.statments);
            this.scope.pop();
        }*/
        return result;
    }
    execForIn(s) {
        if (s.list && s.list.type === 'expression_list') {
            return this.execForInList(s);
        }
        return this.execForInExpression(s);
    }
    execForInList(s) {
        let result;
        this.scope.push();
        this.execute(s.init, `FOR-IN-LIST ${this.sourceRef} INIT`);
        // if (s.init.items[0].reference) {
        //     this.execForInListReferences(s);
        // } else {
        //     this.execForInListValues(s);
        // }
        const reference = s.init.items[0].reference === true;
        const list = new List(this, s.list, reference);
        const name = s.init.items[0].name;
        let index = 0;
        for (const value of list.values) {
            if (reference) {
                this.assign.assignReference(name, value);
            } else {
                this.assign.assign(name, [], value);
            }
            // if only one statement, scope will not create.
            // if more than one statement, means a scope_definition => scope creation
            result = this.execute(s.statements, `FOR-IN-LIST ${this.sourceRef} I:${index}`);
            ++index;
            if (result instanceof BreakCmd) break;
        }
        this.scope.pop();
    }
    execForInListValues(s) {
        const list = new List(this, s.list);
        let index = 0;
        for (const value of list.values) {
            // console.log(s.init.items[0]);
            this.assign.assign(s.init.items[0].name, [], value);
            // if only one statement, scope will not create.
            // if more than one statement, means a scope_definition => scope creation
            result = this.execute(s.statements,`FOR-IN-LIST-VALUES ${this.sourceRef} I:${index}`);
            ++index;
            if (result instanceof BreakCmd) break;
        }
    }
    execForInListReferences(s) {
        const name = s.init.items[0].name;
        assert(!s.init.items[0].indexes);
        let index = 0;
        for (const value of s.list) {
            // console.log(s.init.items[0]);
            this.assign.assignReference(name, value);
            // if only one statement, scope will not create.
            // if more than one statement, means a scope_definition => scope creation
            result = this.execute(s.statements,`FOR-IN-LIST-REFERENCES ${this.sourceRef} I:${index}`);
            ++index;
            if (result instanceof BreakCmd) break;
        }
    }
    execForInExpression(s) {
        // s.list.expr.dump();
        let it = new Iterator(s.list);
        this.scope.push();
        this.execute(s.init,`FOR-IN-EXPRESSION ${this.sourceRef} INIT`);
        let result;
        let index = 0;
        const isReference = s.init.items[0].reference ?? false;
        const name = s.init.items[0].name;
        for (const value of it) {
            if (isReference) this.assign.assignReference(name, value);
            else {
                let expr = new Expression();
                expr._set(value);
                this.assign.assign(name, [], expr);
            }
            result = this.execute(s.statements,`FOR-IN-EXPRESSION ${this.sourceRef} I:${index}`);
            ++index;
            if (result instanceof BreakCmd) break;
        }
        this.scope.pop();
        // this.decodeArrayReference(s.list);
        // [ref, indexs, length] = this.references.getArrayReference(s.list.expr)
        //
    }
    decodeArrayReference(slist) {
        // slist.expr.dump();
        const [name, indexes, legth] = slist.getRuntimeReference();
    }
    execBreak(s) {
        return new BreakCmd();
    }
    execContinue(s) {
        return new ContinueCmd();
    }
    error(s, msg) {
        console.log(s);
        throw new Error(msg);
    }
    execInclude(s) {
        if (s.contents !== false) {
            return this.execute(s.contents);
        }
    }
    execFunctionDefinition(s) {
        let func = new Function(this, s);
        this.references.declare(func.name, 'function');
        this.references.set(func.name, [], func);
    }
    getExprNumber(expr, s, title) {
        // expr.expr.dump();
        const se = this.expressions.eval(expr);
        if (typeof se !== 'bigint') {
//        if (se.op !== 'number') {
            console.log('ERROR');
            console.log(se);
            this.error(s, title + ' is not constant expression (1)');
        }
//        return Number(se.value);
        return se;
    }
    resolveExpr(expr, s, title) {
        return this.expressions.eval(expr);
    }
    execNamespace(s) {
        const subproof = s.subproof ?? false;
        const namespace = s.namespace;
        if (subproof !== false && !this.subproofs.isDefined(subproof)) {
            this.error(s, `subproof ${s.subproof} hasn't been defined`);
        }

        // TODO: verify if namespace just was declared in this case subproof must be the same
        this.context.push(namespace, subproof);
        this.scope.push();
        this.execute(s.statements, `NAMESPACE ${namespace}`);
        this.scope.pop(['witness', 'fixed', 'im']);
        this.context.pop();
    }
    evalExpressionList(e) {
        assert(e.type === 'expression_list');
        let values = [];
        for (const value of e.values) {
            values.push(this.e2value(value));
        }
        return values;
    }
    execSubproofDefinition(s) {
        const subproof = s.name ?? false;
        if (subproof === false) {
            this.error(s, `subproof not defined correctly`);
        }
        let rows = this.evalExpressionList(s.rows);
        this.rows = rows[0];

        this.references.set('N', [], this.rows);

        // TO-DO: eval expressions;
        const subproofInfo = {
            sourceRef: this.sourceRef,
            rows
        };
        this.subproofs.define(subproof, subproofInfo, `subproof ${subproof} has been defined previously on ${subproofInfo.sourceRef}`);
        this.execute(s.statements);
    }
    execWitnessColDeclaration(s) {
        this.colDeclaration(s, 'witness');
    }
    execFixedColDeclaration(s) {
        const global = s.global ?? false;
        for (const col of s.items) {
            const colname = this.context.getFullName(col.name);
            // console.log(`COL_FIXED_DECLARATION(${colname})`);
            const lengths = this.decodeLengths(col);
            let init = s.sequence;
            let seq = null;
            if (init) {
                seq = new Sequence(this, init, this.references.get('N'));
                // console.log(`Extending fixed col ${colname} ...`);
                seq.extend();
                // console.log('SEQ:'+seq.values.join(','));
            }
            this.declareFullReference(colname, 'fixed', lengths, {global}, seq);
        }
    }
    execColDeclaration(s) {
        // intermediate column
        const global = s.global ?? false;
        for (const col of s.items) {
            const lengths = this.decodeLengths(col);
            const id = this.declareFullReference(col.name, col.reference ? '&im' : 'im', lengths, {global});

            let init = s.init;
            if (!init || !init || typeof init.instance !== 'function') {
                continue;
            }
            if (col.reference) {
                this.references.setReference(col.name, s.init.instance());
            } else {
                init = init.instance();
                this.expressions.set(id, init);
            }
        }
    }
    execPublicDeclaration(s) {
        this.colDeclaration(s, 'public', true);
        // TODO: initialization
        // TODO: verification defined
    }
    execChallengeDeclaration(s) {
        this.colDeclaration(s, 'challenge', true);
        // TODO: initialization
        // TODO: verification defined
    }

    execExpr(s) {
        this.expressions.eval(s.expr);
    }
    decodeNameAndLengths(s) {
        return [s.name, this.decodeLengths(s)];
    }
    decodeIndexes(indexes) {
        let values = [];
        if (indexes) {
            for (const index of indexes) {
                values.push(this.expressions.e2number(index));
            }
        }
        return values;
    }
    decodeLengths(s) {
        return this.decodeIndexes(s.lengths);
    }
    colDeclaration(s, type, ignoreInit) {
        const global = s.global ?? false;
        for (const col of s.items) {
            const lengths = this.decodeLengths(col);
            let init = s.init;
            if (init && init && typeof init.instance === 'function') {
                init = init.instance();
            }
            this.declareFullReference(col.name, type, lengths, {global}, ignoreInit ? null : init);
            /// TODO: INIT / SEQUENCE
        }
    }
    declareFullReference(name, type, lengths = [], data = {}, initValue = null) {
        const _name = this.context.getFullName(name);
        return this.declareReference(_name, type, lengths, data, initValue);
    }
    declareReference(name, type, lengths = [], data = {}, initValue = null) {
        if (!data.sourceRef) {
            data.sourceRef = this.sourceRef;
        }
        const res = this.references.declare(name, type, lengths, data);
        if (initValue !== null) {
            this.references.set(name, [], initValue);
        }
        return res;
    }
    execCode(s) {
        return this.execute(s.statements,`CODE ${this.sourceRef}`);
    }
    execOnce(s) {
        if (!s.executed) {
            s.executed = true;
            return this.execute(s.statements,`CODE ${this.sourceRef}`);
        }
        console.log(`Ignore once section because it has already executed ${s.debug}`);
    }
    execConstraint(s) {
        if (this.sourceRef === 'functions_cols.pil:8') {
            s.left.dump(this.sourceRef);
            s.right.dump(this.sourceRef);
            debugger;
        }
        const id = this.constraints.define(s.left.instance(true), s.right.instance(true),false,this.sourceRef);
        const expr = this.constraints.getExpr(id);
        console.log(`\x1B[1;36;44mCONSTRAINT      > ${expr.toString({hideClass:true, hideLabel:false})} === 0 (${this.sourceRef})\x1B[0m`);
        console.log(`\x1B[1;36;44mCONSTRAINT (RAW)> ${expr.toString({hideClass:true, hideLabel:true})} === 0 (${this.sourceRef})\x1B[0m`);
    }
    execVariableIncrement(s) {
        const name = s.name;
        const value = this.references.get(name, []);
        // console.log(`VAR ${name} = ${value}`);
        this.references.set(name, [], value + s.pre + s.post);
    }
    execVariableDeclaration(s) {
        const init = typeof s.init !== 'undefined';
        const count = s.items.length;

        if (init && s.init.length !== count) {
            this.error(s, `Mismatch between len of variables (${count}) and len of their inits (${s.init.length})`);
        }

        for (let index = 0; index < count; ++index) {
            const [name, lengths] = this.decodeNameAndLengths(s.items[index]);
            const sourceRef = s.debug ?? this.sourceRef;
            const global = s.global ?? false;
            this.references.declare(name, s.vtype, lengths, { global, sourceRef });
            let initValue = null;
            if (init) {
                if (s.vtype === 'expr') {
                    // s.init[index].expr.dump('INIT1 '+name);
                    initValue = this.expressions.instance(s.init[index]);
                    // initValue.dump('INIT2 '+name);
                }
                else {
                    initValue = this.expressions.e2value(s.init[index]);
                }
            }
            if (initValue !== null) this.references.set(name, [], initValue);
        }
    }
    execConstantDefinition(s) {
        console.log(s.value.stack[0].operands[0]);
        if (s.sequence) {
            const lengths = this.decodeLengths(s);
            this.references.declare(s.name, 'constant', lengths, { sourceRef: this.sourceRef });
            const def = this.references.getDefinition(s.name);
            // TODO: SEQUENCE_ARRAY_LENGTHS
            const seq = new Sequence(this, s.sequence);
            const asize = def.array.getSize();
            const ssize = seq.size;
            if (ssize !== asize) {
                throw new Error(`Array size mismatch on initialization ${asize} vs ${ssize}`);
            }
            // TODO, check sizes before extends
            const values = seq.extend();
            for (let index = 0; index < values.length; ++index) {
                this.references.set(s.name, def.array.offsetToIndexes(index), values[index]);
            }
        } else {
            this.references.declare(s.name, 'constant', [], { sourceRef: this.sourceRef });
            const value = this.getExprNumber(s.value, s, `constant ${s.name} definition`);
            this.references.set(s.name, [], value);
        }
    }
    evaluateTemplate(template) {
        const regex = /\${[^}]*}/gm;
        let m;
        let tags = [];
        let lindex = 0;
        while ((m = regex.exec(template)) !== null) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            tags.push({pre: m.input.substring(lindex, m.index), expr: m[0].substring(2,m[0].length-1)});
            lindex = m.index + m[0].length;
        }
        const lastS = template.substring(lindex);
        const codeTags = tags.map((x, index) => 'constant ____'+index+' = '+x.expr+";").join("\n");
        const compiledTags = this.compiler.parseExpression(codeTags);
        return compiledTags.map((e, index) => tags[index].pre + this.e2value(e.value)).join('')+lastS;
    }
    evaluateExpression(e){
        // TODO
        TODO_STOP
        return 0n;
    }
    execReturn(s) {
        const sourceRef = this.sourceRef;
        this.traceLog(`[RETURN.BEGIN ${sourceRef}] ${this.scope.deep}`);
        if (!this.insideFunction()) {
            throw new Error('Return is called out of function scope');
        }
        const res = s.value.instance();
        this.traceLog(`[RETURN.END  ${sourceRef}] ${this.scope.deep}`);
        return new ReturnCmd(res);
    }
    e2value(e, s, title) {
        return this.expressions.e2value(e, s, title);
    }
}
