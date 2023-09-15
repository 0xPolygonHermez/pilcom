const {assert, assertLog} = require('./assert.js');
const Scope = require("./scope.js");
const Expressions = require("./expressions.js");
const Expression = require("./expression.js");
const Definitions = require("./definitions.js");
const References = require("./references.js");
const Indexable = require("./indexable.js");
const Ids = require("./ids.js");
const Constraints = require("./constraints.js");
const Subproof = require("./subproof.js");
const Subproofs = require("./subproofs.js");
const Air = require("./air.js");
const Airs = require("./airs.js");
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
const Runtime = require("./runtime.js");
// const FunctionCall = require("./function_call.js");
const {FlowAbortCmd, BreakCmd, ContinueCmd, ReturnCmd} = require("./flow_cmd.js")
// const {ReferenceItem, ExpressionItem, FeValue, IntValue, ProofItem, Proofval, Subproofval, Challenge, Public, ProofStageItem,
//       ExpressionReference, StringValue, FixedCol, WitnessCol } = require("./expression_items.js");

const ExpressionItems = require("./expression_items.js");
const ExpressionItem = ExpressionItems.ExpressionItem;
const DefinitionItems = require("./definition_items.js");
const fs = require('fs');
const { log2, getKs, getRoots } = require("./utils.js");
const Hints = require('./hints.js');
const util = require('util');

module.exports = class Processor {
    constructor (Fr, parent) {
        this.compiler = parent;
        this.trace = true;
        this.Fr = Fr;
        this.references = new References();
        this.scope = new Scope();
        this.runtime = new Runtime();
        this.context = new Context(this.Fr, this);

        this.scope.mark('proof');
        this.delayedCalls = {};

        this.airId = 0;
        this.subproofId = 0;

        this.ints = new Variables('int', DefinitionItems.IntValue, ExpressionItems.IntValue);
        this.references.register('int', this.ints);

        this.fes = new Variables('fe', DefinitionItems.FeValue, ExpressionItems.FeValue);
        this.references.register('fe', this.fes);

        this.strings = new Variables('string', DefinitionItems.StringValue, ExpressionItems.FeValue);
        this.references.register('string', this.strings);

        this.exprs = new Variables('expr', DefinitionItems.Expression, Expression);
        this.references.register('expr', this.exprs);

        this.subexprs = new Variables('subexpr', DefinitionItems.Expression, Expression);
        this.references.register('subexpr', this.subexprs);

        // this.lexprs = new Variables('lexpr', Expression);
        // this.references.register('lexpr', this.lexprs);

        this.fixeds = new FixedCols();
        ExpressionItem.setManager(ExpressionItems.FixedCol, this.fixeds);
        this.fixeds.runtimeRows = true;
        this.references.register('fixed', this.fixeds);

        this.witness = new WitnessCols();
        ExpressionItem.setManager(ExpressionItems.WitnessCol, this.witness);
        this.references.register('witness', this.witness);

//        this.constants = new Indexable('constant', IntValue);
//        this.references.register('constant', this.constants);

        this.publics = new Indexable('public', DefinitionItems.Public, ExpressionItems.Public);
        ExpressionItem.setManager(ExpressionItems.Public, this.publics);
        this.references.register('public', this.publics);

        this.challenges = new Indexable('challenge', DefinitionItems.Challenge, ExpressionItems.Challenge);
        ExpressionItem.setManager(ExpressionItems.Challenge, this.challenges);
        this.references.register('challenge', this.challenges);

        this.proofvalues = new Indexable('proofvalue', DefinitionItems.Proofval, ExpressionItems.Proofval);
        ExpressionItem.setManager(ExpressionItems.Proofval, this.proofvalues);
        this.references.register('proofvalue', this.proofvalues);

        this.subproofvalues = new Indexable('subproofvalue', DefinitionItems.Subproofval, ExpressionItems.Subproofval);
        ExpressionItem.setManager(ExpressionItems.Subproofval, this.subproofvalues);
        this.references.register('subproofvalue', this.subproofvalues);

        this.functions = new Indexable('function', Function, ExpressionItems.FunctionCall);
        ExpressionItem.setManager(ExpressionItems.FunctionCall, this.functions);
        this.references.register('function', this.functions);

        this.subproofs = new Subproofs();

        this.expressions = new Expressions();
        this.globalExpressions = new Expressions();

        // this.references.register('im', this.expressions);

        this.constraints = new Constraints();
        this.globalConstraints = new Constraints();

        this.assign = new Assign(Fr, this, this.context, this.references, this.expressions);
        this.hints = new Hints(Fr, this.expressions);

        this.executeCounter = 0;
        this.executeStatementCounter = 0;
        this.functionDeep = 0;
        this.callstack = []; // TODO
        this.breakpoints = ['expr.pil:26'];
        this.loadBuiltInClass();
        this.scopeType = 'proof';
        this.currentSubproof = false;
    }
    loadBuiltInClass() {
        const filenames = fs.readdirSync(__dirname + '/builtin');
        this.builtIn = {};
        for (const filename of filenames) {
            if (!filename.endsWith('.js')) continue;
            if (this.context.config.debug.builtInLoad) {
                console.log(`Loading builtin ${filename}.....`);
            }
            console.log(filename);
            const builtInCls = require(__dirname + '/builtin/'+ filename);
            const builtInObj = new builtInCls(this);
            this.builtIn[builtInObj.name] = builtInObj;
        }
    }
    insideFunction() {
        return this.functionDeep > 0;
    }
    startExecution(statements) {
        let bits = 0;
        while (bits < 530) {
            ++bits;
            let value = 2n ** BigInt(bits);
            // console.log([value, bits, this.log2(value)]);
            assert(bits === this.log2(value));
            assert((bits-1) === this.log2(value-1n));
            assert(bits === this.log2(value+1n));
            // if (value > 0n) console.log([value-1n, bits, this.log2(value-1n)]);
        }
        // TODO: use a constant
        this.references.declare('N', 'int', [], { global: true, sourceRef: this.sourceRef });
        this.references.declare('BITS', 'int', [], { global: true, sourceRef: this.sourceRef });
        this.references.declare('__SUBPROOF__', 'string', [], { global: true, sourceRef: this.sourceRef });
        this.scope.pushInstanceType('proof');
        this.execute(statements);
        this.executeSubproofs();
        this.finalProofScope();
        this.scope.popInstanceType();
        this.generateOut();
    }
    executeSubproofs() {
        for (const name of this.subproofs) {
            this.executeSubproof(name, this.subproofs.get(name));
        }
    }
    generateOut()
    {
        //packed.dump();
        // this.constraints.dump(packed);
        // this.fixeds.dump();

        let proto = new ProtoOut(this.Fr);
        proto.setupPilOut('myFirstPil');
        let subproofId = 0;
        proto.setSubproofvalues(this.subproofvalues.getPropertyValues(['id', 'aggregateType', 'subproofId']));
        proto.setPublics(this.publics);
        proto.setProofvalues(this.proofvalues);
        proto.setChallenges(this.challenges);
        for (const subproofName of this.subproofs) {
            const subproof = this.subproofs.get(subproofName);
            proto.setSubproof(subproofName, subproof.aggregate);
            let airId = 0;
            for (const airName of subproof.airs) {
                const air = subproof.airs.get(airName);
                const bits = log2(Number(air.rows));
                proto.setAir(airName, air.rows);
                proto.setFixedCols(air.fixeds);
                // expression: constraint, hint, operand (expression)
                let packed = new PackedExpressions();
                // this.expressions.pack(packed);
                air.expressions.pack(packed);
                proto.setConstraints(air.constraints, packed,
                    { labelsByType: {
                        witness: air.witness.labelRanges,
                        fixed: air.fixeds.labelRanges,
                    }
                });
                proto.setWitnessCols(air.witness);
                proto.setSymbolsFromLabels(air.witness.labelRanges, 'witness', {airId, subproofId});
                proto.setSymbolsFromLabels(air.fixeds.labelRanges, 'fixed', {airId, subproofId});
                proto.setExpressions(packed);
                proto.addHints(air.hints, packed, {
                        subproofId,
                        airId
                    });
                ++airId;
            }
            ++subproofId;
        }
        let packed = new PackedExpressions();
        // this.expressions.pack(packed);
        this.globalExpressions.pack(packed);
        proto.setGlobalConstraints(this.globalConstraints, packed);
        proto.setGlobalExpressions(packed);
        proto.setGlobalSymbols(this.references);
        proto.encode();
        proto.saveToFile('tmp/pilout.ptb');
        // stageWidths
        // expressions

        // publics
        // this.imCols.dump();
    }
    traceLog(text, color = '') {
        if (!this.trace) return;
        console.log([Expression.constructor.name]);
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
            console.log([Expression.constructor.name]);
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
        const func = this.builtIn[name] ?? this.references.get(name);

        if (func) {
            this.callstack.push(st.debug);
            ++this.functionDeep;
            this.scope.push();
            console.log(func.constructor.name);
            const mapInfo = func.mapArguments(st);
            this.references.pushVisibilityScope();
            const res = func.exec(st, mapInfo);
            this.references.popVisibilityScope();
            this.scope.pop();
            --this.functionDeep;
            this.callstack.pop();
            return res;
        }
        this.error(st, `Undefined function ${name}`);
    }
    execAssign(st) {
        // type: number(int), fe, string, col, challenge, public, prover,
        // dimensions:
        // TODO: move to assign class
        const indexes = this.decodeIndexes(st.name.indexes)
        const names = this.context.getNames(st.name.name);
        console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> EXEC-ASSIGN <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
        if (st.name.reference) {
            assert(indexes.length === 0);
            const assignedValue = st.value.instance();
            console.log(assignedValue);
            this.assign.assignReference(names, assignedValue);
            return;
        }
        console.log(st.value);
        this.assign.assign(names, indexes, st.value);
        // this.references.set(st.name.name, [], this.expressions.eval(st.value));
    }
    execHint(s) {
        const name = s.name;
        console.log(util.inspect(s.data, false, null, true));
        const res = this.processHintData(s.data);
        console.log(util.inspect(res, false, null, true));
        this.hints.define(name, res);
    }
    processHintData(hdata) {
        if (hdata.type === 'array') {
            let result = [];
            for (const item of hdata.data) {
                result.push(this.processHintData(item));
            }
            return result;
        }
        if (hdata.type === 'object') {
            let result = {};
            for (const key in hdata.data) {
                // TODO: key no exists
                result[key] = this.processHintData(hdata.data[key]);
            }
            return result;
        }
        if (hdata instanceof Expression) {
            const value = hdata.eval();
            if (typeof value === 'bigint') return value;
            return hdata.instance();
        }
        console.log(hdata);
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
    execUse(s) {
        const name = this.expandTemplates(s.name);
        this.references.addUse(name);
    }
    execContainer(s) {
        const name = this.expandTemplates(s.name);
        if (this.references.createContainer(name, s.alias)) {
            const result = this.execute(s.statements, `SCOPE ${this.sourceRef}`);
            this.references.closeContainer();
        }
    }
    // TODO: remove - obsolete
    execScopeDefinition(s) {
        this.scope.push();
        const result = this.execute(s.statements, `SCOPE ${this.sourceRef}`);
        this.scope.pop();
        return result;
    }
    // TODO: remove - obsolete
    execNamedScopeDefinition(s) {
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
        console.log(s);
        console.log(s.list);
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
        console.log('FUNCTION '+s.funcname);
        let func = new Function(this, s);
        this.references.declare(func.name, 'function');
        this.references.set(func.name, [], func);
    }
    getExprNumber(expr, s, title) {
        console.log(s);
        expr.dump();
        // expr.expr.dump();
        const se = ExpressionItems.IntValue.castTo(expr.eval());
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
    log2_32bits(value) {
            return (  (( value & 0xFFFF0000 ) !== 0 ? ( value &= 0xFFFF0000, 16 ) :0 )
                    | (( value & 0xFF00FF00 ) !== 0 ? ( value &= 0xFF00FF00, 8  ) :0 )
                    | (( value & 0xF0F0F0F0 ) !== 0 ? ( value &= 0xF0F0F0F0, 4  ) :0 )
                    | (( value & 0xCCCCCCCC ) !== 0 ? ( value &= 0xCCCCCCCC, 2  ) :0 )
                    | (( value & 0xAAAAAAAA ) !== 0 ? 1: 0 ) );
    }
    log2(value) {
        let base = 0;
        value = BigInt(value);
        while (value > 0xFFFFFFFFn) {
            base += 32;
            value = value >> 32n;
        }

        return base + this.log2_32bits(Number(value));
    }
    checkRows(rows) {
        for (const row of rows) {
            if (2n ** BigInt(this.log2(row)) === row) continue;
            throw new Error(`Invalid row ${row}. Rows must be a power of 2`);
        }
    }
    execSubproofDefinition(s) {
        const subproofName = s.name ?? false;
        if (subproofName === false) {
            this.error(s, `subproof not defined correctly`);
        }

        let subproofRows = this.evalExpressionList(s.rows);
        this.checkRows(subproofRows);

        // TODO: Fr inside context
        const subproof = new Subproof(subproofRows, s.statements, s.aggregate ?? false);
        this.subproofs.define(subproofName, subproof, `subproof ${subproofName} has been defined previously on ${this.context.sourceRef}`);
    }
    execSubproofBlock(s) {
        const subproofName = s.name ?? false;
        if (subproofName === false) {
            this.error(s, `subproof not defined correctly`);
        }
        const subproof = this.subproofs.get(subproofName);
        if (!subproof) {
            throw new Error(`Subproof definition ${subproofName} hasn't been defined before subproof block`);
        }
        subproof.addBlock(s.statements);
    }
    executeSubproof(subproofName, subproof) {
        this.currentSubproof = subproof;
        this.scope.pushInstanceType('subproof');
        for (const airRows of subproof.rows) {
            this.rows = airRows;

            console.log(`BEGIN AIR ${subproofName} (${airRows}) #${this.airId}`);
            const air = new Air(this.Fr, this.context, airRows);

            const airName = subproofName + (subproof.rows.length > 1 ? `_${air.bits}`:'');
            subproof.airs.define(airName, air);

            // TO-DO loop with different rows
            console.log([air.bits, air.rows, Expression.constructor.name]);

            // create built-in constants
            this.references.set('N', [], air.rows);
            this.references.set('BITS', [], air.bits);
            this.references.set('__SUBPROOF__', [], subproofName);

            this.context.push(false, subproofName);
            this.scope.pushInstanceType('air');
            subproof.airStart();
            for (const statements of subproof.blocks) {
                // REVIEW: clear uses and regular expressions
                // this.scope.push();
                this.execute(statements, `SUBPROOF ${subproofName}`);
                // this.scope.pop();
            }
            this.finalAirScope();
            subproof.airEnd();
            air.witness = this.witness.clone();
            air.fixeds = this.fixeds.clone();
            air.expressions = this.expressions.clone();
            air.constraints = this.constraints.clone();
            air.constraints.expressions = air.expressions;
            air.hints = this.hints.clone();
            air.hints.expressions = air.expressions;
            this.clearAirScope();
            this.constraints = new Constraints(this.Fr, this.expressions);
            this.scope.popInstanceType(['witness', 'fixed', 'im']);
            this.context.pop();
            console.log(`END AIR ${subproofName} (${airRows}) #${this.airId}`);
            ++this.airId;
        }
        this.finalSubproofScope();
        this.scope.popInstanceType();
        this.currentSubproof = false;
        ++this.subproofId;
    }
    finalAirScope() {
        this.callDelayedFunctions('air', 'final');
    }
    clearAirScope() {
        this.references.clearType('fixed');
        this.references.clearType('witness');
        this.expressions.clear();
    }
    finalSubproofScope() {
        this.callDelayedFunctions('subproof', 'final');
    }
    finalProofScope() {
        this.callDelayedFunctions('proof', 'final');
    }
    callDelayedFunctions(scope, event) {
        if (typeof this.delayedCalls[scope] === 'undefined' || typeof this.delayedCalls[scope][event] === 'undefined') {
            return false;
        }
        for (const fname in this.delayedCalls[scope][event]) {
            this.execCall({ op: 'call', function: {name: fname}, arguments: [] });
        }
    }
    execWitnessColDeclaration(s) {
        this.colDeclaration(s, 'witness', false, true, {stage: s.stage ? Number(s.stage):0 });
    }
    execFixedColDeclaration(s) {
        const global = s.global ?? false;
        for (const col of s.items) {
            const colname = this.context.getFullName(col.name);
            // console.log(`COL_FIXED_DECLARATION(${colname})`);
            const lengths = this.decodeLengths(col);
            let init = s.sequence ?? null;
            let seq = null;
            if (init) {
                seq = new Sequence(this, init, ExpressionItems.IntValue.castTo(this.references.get('N')));
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
        this.colDeclaration(s, 'public', true, false);
        // TODO: initialization
        // TODO: verification defined
    }
    execProofValueDeclaration(s) {
        this.colDeclaration(s, 'proofvalue', true, false);
        // TODO: initialization
        // TODO: verification defined
    }
    execSubproofValueDeclaration(s) {
        const name = s.items[0].name ?? '';

        if (this.currentSubproof === false) {
            throw new Error(`Subproofvalue ${name} must be declared inside subproof (air)`);
        }
        for (const value of s.items) {
            const lengths = this.decodeLengths(value);
            const res = this.currentSubproof.declareSubproofvalue(value.name, lengths, {aggregateType: s.aggregateType, subproofId: this.subproofId, sourceRef: this.sourceRef});
        }
    }
    execChallengeDeclaration(s) {
        this.colDeclaration(s, 'challenge', true, false, {stage: s.stage ? Number(s.stage):0});
        // TODO: initialization
        // TODO: verification defined
    }
    execDelayedFunctionCall(s) {
        const scope = s.scope;
        const fname = s.function.name;
        const event = s.event;
        if (s.arguments.length > 0) {
            throw new Error('delayed function call arguments are not yet supported');
        }
        if (event !== 'final') {
            throw new Error(`delayed function call event ${event} no supported`);
        }
        if (['proof', 'subproof', 'air'].includes(scope) === false) {
            throw new Error(`delayed function call scope ${scope} no supported`);
        }
        if (typeof this.delayedCalls[scope] === 'undefined') {
            this.delayedCalls[scope] = {};
        }
        if (typeof this.delayedCalls[scope][event] === 'undefined') {
            this.delayedCalls[scope][event] = {};
        }
        if (typeof this.delayedCalls[scope][event][fname] === 'undefined') {
            this.delayedCalls[scope][event][fname] = {sourceRefs: []};
        }
        this.delayedCalls[scope][event][fname].sourceRefs.push(this.context.sourceRef);
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
    colDeclaration(s, type, ignoreInit, fullName = true, data = {}) {
        for (const col of s.items) {
            const lengths = this.decodeLengths(col);
            let init = s.init;
            if (init && init && typeof init.instance === 'function') {
                init = init.instance();
            }
            if (fullName) this.declareFullReference(col.name, type, lengths, data, ignoreInit ? null : init);
            else this.declareReference(col.name, type, lengths, data, ignoreInit ? null : init);
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
            if (type === 'fixed') {
                console.log('FIXED-SET', initValue.getValue(0), initValue.getValue(1));
            }
            this.references.set(name, [], initValue);
            if (type === 'fixed') {
                console.log('FIXED-SET', this.fixeds.values[0]);
            }
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
        const scopeType = this.scope.getInstanceType();
        let id, expr, prefix = '';

        assertLog(s.left instanceof Expression, s.left);
        assertLog(s.right instanceof Expression, s.right);
        console.log(s.left);
        console.log(s.right);
        const left = s.left.instance();
        console.log(left);
        const right = s.right.instance();
        console.log(right);
        if (scopeType === 'air') {
            id = this.constraints.define(s.left.instance(true), s.right.instance(true),false,this.sourceRef);
            expr = this.constraints.getExpr(id);
        } else if (scopeType === 'proof') {
            id = this.globalConstraints.define(s.left.instance(true), s.right.instance(true),false,this.sourceRef);
            expr = this.globalConstraints.getExpr(id);
            prefix = 'GLOBAL';
        } else {
            throw new Error(`Constraint definition on invalid scope (${scopeType}) ${this.context.sourceRef}`);
        }
        console.log(`\x1B[1;36;44m${prefix}CONSTRAINT      > ${expr.toString({hideClass:true, hideLabel:false})} === 0 (${this.sourceRef})\x1B[0m`);
        console.log(`\x1B[1;36;44m${prefix}CONSTRAINT (RAW)> ${expr.toString({hideClass:true, hideLabel:true})} === 0 (${this.sourceRef})\x1B[0m`);
    }
    execVariableIncrement(s) {
        // REVIEW used only inside loop (increment) in other cases was an expression
        const name = s.name;
        const value = this.references.get(name, []);
        // REVIEW: could be an expression (if expression x+1+1 = x+2)
        console.log(s.pre, s.post, value.getValue());
        this.references.set(name, [], value.getValue() + s.pre + s.post);
    }
    execVariableDeclaration(s) {
        console.log('VARIABLE DECLARATION '+this.context.sourceRef+' init:'+s.init);
        const init = typeof s.init !== 'undefined';
//         console.log(s);
        const count = s.items.length;

        if (init && s.init.length !== count) {
            this.error(s, `Mismatch between len of variables (${count}) and len of their inits (${s.init.length})`);
        }

        for (let index = 0; index < count; ++index) {
            // console.log(s.items[index]);
            const [name, lengths] = this.decodeNameAndLengths(s.items[index]);
            const sourceRef = s.debug ?? this.sourceRef;
            const scope = s.scope ?? false;
            let initValue = null;
            if (init) {
                console.log(s.vtype);
                if (s.vtype === 'expr') {
                    // s.init[index].expr.dump('INIT1 '+name);
                    console.log(s.init[index]);
                    initValue = s.init[index].eval();
                    console.log(initValue);
                    // initValue.dump('INIT2 '+name);
                }
                else {
                    initValue = new ExpressionItems.IntValue(this.expressions.e2value(s.init[index]));
                }
            }
            console.log(initValue);
            this.references.declare(name, s.vtype, lengths, { scope, sourceRef }, initValue);
            // if (initValue !== null) this.references.set(name, [], initValue);
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
            seq.extend();
            const seqSize = seq.getSize();
            for (let index = 0; index < seqSize; ++index) {
                this.references.set(s.name, def.array.offsetToIndexes(index), seq.getValue(index));
            }
        } else {
            this.references.declare(s.name, 'constant', [], { sourceRef: this.sourceRef });
            const value = this.getExprNumber(s.value, s, `constant ${s.name} definition`);
            this.references.set(s.name, [], value);
        }
    }
    expandTemplates(text) {
        if (!text.includes('${')) {
            return text;
        }
        return this.evaluateTemplate(text);
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
