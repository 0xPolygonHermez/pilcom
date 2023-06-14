const {assert} = require("chai");
const Scope = require("./scope.js");
const Expressions = require("./expressions.js");
const Expression = require("./expression.js");
const Definitions = require("./definitions.js");
const References = require("./references.js");
const Indexable = require("./indexable.js");
const Ids = require("./ids.js");
const Constraints = require("./constraints.js");
const Subairs = require("./subairs.js");
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

module.exports = class Processor {
    constructor (Fr, parent, references, expressions) {
        this.trace = false;
        this.Fr = Fr;
        this.context = new Context(this.Fr);
        this.scope = new Scope(this.Fr);
        this.references = new References(Fr, this.context, this.scope);

        this.ints = new Variables(Fr, 'int');
        this.references.register('int', this.ints);

        this.fes = new Variables(Fr, 'fe');
        this.references.register('fe', this.fes);

        this.fixeds = new FixedCols(Fr);
        this.fixeds.runtimeRows = true;
        this.references.register('fixed', this.fixeds);

        this.witness = new WitnessCols(Fr);
        this.references.register('witness', this.witness);

        this.constants = new Indexable(Fr, 'constant');
        this.references.register('constant', this.constants);

        this.publics = new Ids('public');
        this.references.register('public', this.publics);

        this.prover = new Ids('prover');
        this.references.register('prover', this.prover);

//        this.imCols = new Indexable(Fr, 'im');
//        this.references.register('im', this.imCols);

        this.functions = new Indexable(Fr, 'function');
        this.references.register('function', this.functions);

        this.subairs = new Subairs(Fr);

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
    }
    insideFunction() {
        return this.functionDeep > 0;
    }
    startExecution(statements) {
        this.references.declare('N', 'int', [], { sourceRef: this.sourceRef });
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
        proto.setAir('myFirstAir', this.rows);
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
        this.sourceRef = st.debug ?? '';
        if (st.debug === 'functions2.pil:53') {
            debugger;
        }
        try {
            res = this[method](st);
        } catch (e) {
            console.log("EXCEPTION ON "+this.sourceRef);
            throw e;
        }
        return res;
    }
    execCall(st) {
        if (this.scope.deep > 12) {
            EXIT_HERE;
        }
        const namespace = st.function.namespace;
        const name = st.function.name;
        if (namespace === 'this') {
            const builtInMethod = 'execBuiltIn' + name.charAt(0).toUpperCase() + name.slice(1);
            if (builtInMethod in this) {
                return this[builtInMethod](st);
            }
        }
        const tval = this.references.getTypedValue(name);
        if (tval.value) {
            // TODO: push without visibility out of function
            ++this.functionDeep;
            this.scope.push();
            const res = tval.value.exec(st);
            this.scope.pop();
            --this.functionDeep;
            return res;
        }
        this.error(st, `Undefined function statement type: ${name}`);
    }
    execAssign(st) {
        // type: number(int), fe, string, col, challenge, public, prover,
        // dimensions:
        const indexes = this.decodeIndexes(st.name.indexes)
        const names = this.context.getNames(st.name);
        if (st.name.reference) {
            assert(indexes.length === 0);
            this.assign.assignReference(names, st.value.expr.instance());
            return;
        }
        this.assign.assign(names, indexes, st.value);
        // this.references.set(st.name.name, [], this.expressions.eval(st.value));
    }
    execBuiltInPrintln(s) {
//        const sourceRef = this.parent.fileName + ':' + s.first_line;
        let texts = [];
        for (const arg of s.arguments) {
            texts.push(typeof arg === 'string' ? arg : this.expressions.e2value(arg));
        }
        // [${sourceRef}]
        console.log(`\x1B[1;35m[${s.debug}] ${texts.join(' ')} (DEEP:${this.scope.deep})\x1B[0m`);
        return 0;
    }
    execBuiltInAssertEq(s) {
        if (s.arguments.length !== 2) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = this.expressions.e2value(s.arguments[0]);
        const arg1 = this.expressions.e2value(s.arguments[1]);
        if (arg0 !== arg1) {
            throw new Error(`AssertEq fails ${arg0} vs ${arg1} on ${this.sourceRef}`);
        }
        return 0;
    }
    execBuiltInAssertNotEq(s) {
        if (s.arguments.length !== 2) {
            throw new Error('Invalid number of parameters');
        }
        if (this.expressions.e2value(s.arguments[0]) === this.expressions.e2value(s.arguments[1])) {
            console.log('ASSERT FAILS')
        }
        return 0;
    }
    execBuiltInLength(s) {
        if (s.arguments.length !== 1) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = s.arguments[0].expr;
        if (arg0 && arg0.isReference()) {
            // TODO: check arrays, multiarrays - no arrays, valid for strings?
            const [instance,rinfo] = this.expressions.getReferenceInfo(arg0);
            const operand = arg0.getAloneOperand();
            return BigInt(rinfo.array.getLength(operand.dim));
        }
        const value = this.expressions.e2value(s.arguments[0]);
        if (typeof value === 'string') {
            return value.length;
        }
        EXIT_HERE;
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
            // console.log(this.parent.getFullName(arg)+': '+this.expressions.e2num(arg));
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
        const name = reference ? this.context.getNames(s.init.items[0]) : s.init.items[0].name;
        let index = 0;
        for (const value of list.values) {
            // console.log(s.init.items[0]);
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
        const names = this.context.getNames(s.init.items[0]);
        assert(!s.init.items[0].indexes);
        console.log(s.list);
        let index = 0;
        for (const value of s.list) {
            // console.log(s.init.items[0]);
            this.assign.assignReference(names, value);
            // if only one statement, scope will not create.
            // if more than one statement, means a scope_definition => scope creation
            result = this.execute(s.statements,`FOR-IN-LIST-REFERENCES ${this.sourceRef} I:${index}`);
            ++index;
            if (result instanceof BreakCmd) break;
        }
    }
    execForInExpression(s) {
        // console.log(s);
        // s.list.expr.dump();
        let it = new Iterator(s.list.expr);
        this.scope.push();
        this.execute(s.init,`FOR-IN-EXPRESSION ${this.sourceRef} INIT`);
        let result;
        let index = 0;
        for (const value of it) {
            this.assign.assign(s.init.items[0].name, [], value);
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
        // console.log(slist);
        // slist.expr.dump();
        const [name, indexes, legth] = slist.expr.getRuntimeReference();
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
        const subair = s.subair ?? false;
        const namespace = s.namespace;
        if (subair !== false && !this.subairs.isDefined(subair)) {
            this.error(s, `subair ${s.subair} hasn't been defined`);
        }

        // TODO: verify if namespace just was declared in this case subair must be the same
        this.context.push(namespace, subair);
        this.scope.push();
        this.execute(s.statements, `NAMESPACE ${namespace}`);
        this.scope.pop();
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
    execSubairDefinition(s) {
        const subair = s.name ?? false;
        if (subair === false) {
            this.error(s, `subair not defined correctly`);
        }
        let rows = this.evalExpressionList(s.rows);
        this.rows = rows[0];

        this.references.set('N', [], this.rows);

        // TO-DO: eval expressions;
        const subairInfo = {
            sourceRef: this.sourceRef,
            rows
        };
        this.subairs.define(subair, subairInfo, `subair ${subair} has been defined previously on ${subairInfo.sourceRef}`);
    }
    execWitnessColDeclaration(s) {
        this.colDeclaration(s, 'witness');
    }
    execFixedColDeclaration(s) {
        for (const col of s.items) {
            const colname = this.context.getFullName(col);
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
            this.declareReference(colname, 'fixed', lengths, {}, seq);
        }
    }
    execColDeclaration(s) {
        // intermediate column
        for (const col of s.items) {
            const colname = this.context.getFullName(col);
            const lengths = this.decodeLengths(col);
            // if (col.reference)
            const id = this.declareReference(colname, col.reference ? '&im' : 'im', lengths, {});

            let init = s.init;
            if (!init || !init.expr || typeof init.expr.instance !== 'function') {
                return;
            }
            if (col.reference) {
                this.references.setReference(colname, s.init.expr.instance());
            } else {
                init = init.expr.instance();
                this.expressions.set(id, init);
            }
        }
    }
    execPublicDeclaration(s) {
        this.colDeclaration(s, 'public', true);
        // TODO: initialization
        // TODO: verification defined
    }
    execExpr(s) {
        this.expressions.eval(s);
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
        for (const col of s.items) {
            const colname = this.context.getFullName(col);
            // console.log(`COL_DECLARATION(${colname}) type:${type}`);
            const lengths = this.decodeLengths(col);
            let init = s.init;
            if (init && init.expr && typeof init.expr.instance === 'function') {
                //init.expr.eval(this.expressions);
                //init.expr.dump();
                init = init.expr.instance();
                // init.dump();
                //init.dump();
            }
            this.declareReference(colname, type, lengths, {}, ignoreInit ? null : init);
            /// TODO: INIT / SEQUENCE
        }
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
    execConstraint(s) {
        const id = this.constraints.define(s.left.expr.instance(true), s.right.expr.instance(true),false,this.sourceRef);
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

            this.references.declare(name, s.vtype, lengths, { sourceRef: this.sourceRef });
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
        const res = s.value.expr.instance();
        this.traceLog(`[RETURN.END  ${sourceRef}] ${this.scope.deep}`);
        return new ReturnCmd(res);
    }
    e2value(e, s, title) {
        return this.expressions.e2value(e, s, title);
    }
}
