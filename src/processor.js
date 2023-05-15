const Scope = require("./scope.js");
const Expressions = require("./expressions.js");
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

class BreakCmd {};
class ContinueCmd {};

module.exports = class Processor {
    constructor (Fr, parent, references, expressions) {
        this.Fr = Fr;
        this.scope = new Scope(this.Fr);
        this.references = new References(Fr, this.scope);

        this.variables = new Variables(Fr, this.references, this.expressions);
        this.references.register('var', this.variables);

        this.fixeds = new Ids('fixed');
        this.references.register('fixed', this.fixeds);

        this.witness = new Ids('witness');
        this.references.register('witness', this.witness);

        this.constants = new Indexable(Fr, 'constant');
        this.references.register('constant', this.constants);

        this.publics = new Ids(Fr, 'public');
        this.references.register('public', this.publics);

        this.prover = new Ids(Fr, 'prover');
        this.references.register('prover', this.prover);

        this.imCols = new Indexable(Fr, 'im');
        this.references.register('im', this.prover);

        this.subairs = new Subairs(Fr);

        this.globalConstraints = new Constraints(Fr);
        this.constraints = new Constraints(Fr);
        this.expressions = new Expressions(Fr, this, this.references, this.publics, this.constants);
        this.globalExpressions = new Expressions(Fr, this, this.references, this.publics, this.constants);

        this.assign = new Assign(Fr, this, this.references, this.expressions);

        this.executeCounter = 0;
        this.executeStatementCounter = 0;
    }
    execute(statements) {
        ++this.executeCounter;
        const lstatements = Array.isArray(statements) ? statements : [statements];
        console.log(`## DEBUG ## ${this.executeCounter}[${lstatements.length}]`)
        for (const st of lstatements) {
            const result = this.executeStatement(st);
            if (result instanceof BreakCmd || result instanceof ContinueCmd) return result;
        }
    }
    executeStatement(st) {
        ++this.executeStatementCounter;
        if (typeof st.type === 'undefined') {
            console.log(st);
            this.error(st, `Invalid statement (without type)`);
        }
        console.log(`## DEBUG ## ${this.executeCounter}.${this.executeStatementCounter} ${st.debug}` );
        const method = ('exec_'+st.type).replace(/[-_][a-z]/g, (group) => group.slice(-1).toUpperCase());
//        const method = 'exec' + st.type.charAt(0).toUpperCase() + st.type.slice(1);
        if (!(method in this)) {
            console.log('==== ERROR ====');
                this.error(st, `Invalid statement type: ${st.type}`);
        }
        this.sourceRef = st.debug ?? '';
        return this[method](st);
    }
    execCall(st) {
        const namespace = st.function.namespace;
        const name = st.function.name;
        if (namespace === 'this') {
            const buildInMethod = 'execBuildIn' + name.charAt(0).toUpperCase() + name.slice(1);
            if (buildInMethod in this) {
                this[buildInMethod](st);
            }
            return;
        }
        const fname = namespace + '.' + name;
        this.error(st, `Undefined function statement type: ${fname}`);
    }
    execVar(st) {
        const fullname = this.getFullName(st);
        this.scope.define(fullname, {value: st.init ? this.expressions.e2value(st.init):null});
    }
    execAssign(st) {

        // type: number(int), fe, string, col, challenge, public, prover,
        // dimensions:
        this.assign.assign(st.name.name, [], st.value);
        // this.references.set(st.name.name, [], this.expressions.eval(st.value));
    }
    execBuildInPrintln(s) {
//        const sourceRef = this.parent.fileName + ':' + s.first_line;
        let texts = [];
        for (const arg of s.arguments) {
            texts.push(typeof arg === 'string' ? arg : this.expressions.e2value(arg));
        }
        // [${sourceRef}]
        console.log(`\x1B[1;35m${texts.join(' ')}\x1B[0m`);
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

            if (typeof cond.expression !== 'undefined' && this.expressions.e2value(cond.expression) !== true) {
                continue;
            }
            this.scope.push();
            this.execute(cod.statements);
            console.log(res);
            this.scope.pop();
            if (typeof res === 'boolean') {
                return res;
            }
            break;
            // console.log(this.parent.getFullName(arg)+': '+this.expressions.e2num(arg));
        }
    }
    execWhile(s) {
        while (this.expressions.e2value(s.condition)) {
            this.scope.push();
            this.execute(s.statements);
            this.scope.pop();
            if (res === false) break;
        }
    }
    execScopeDefinition(s) {
        this.scope.push();
        console.log(s);
        console.log(s.statements);
        const result = this.execute(s.statements);
        this.scope.pop();
        return result;
    }
    execFor(s) {
        // console.log(s.init);
        let result;
        this.scope.push();
        console.log('INIT');
        console.log(s.init[0]);
        this.execute(s.init);
        while (this.expressions.e2value(s.condition)) {
            // if only one statement, scope will not create.
            // if more than one statement, means a scope_definition => scope creation
            result = this.execute(s.statements);
            if (result instanceof BreakCmd) break;
            this.execute(s.increment);
        }
        this.scope.pop();
        // console.log(s);
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
        console.log(s.list);
        const list = new List(this, s.list);
        console.log(list.values);
    }
    execForInExpression(s) {
        console.log(s);
        TODO_STOP;

    }
    execBreak(s) {
        return false;
    }
    execContinue(s) {
        return true;
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

    }
    getExprNumber(expr, s, title) {
        console.log(expr);
        const se = this.expressions.eval(expr);
        if (se.op !== 'number') {
            this.error(s, title + ' is not constant expression');
        }
        return Number(se.value);
    }
    resolveExpr(expr, s, title) {
        console.log(expr);
        return this.expressions.eval(expr);
    }
    execNamespace(s) {
        const subair = s.subair ?? false;
        const namespace = s.namespace;
        if (subair !== false && !this.subairs.isDefined(subair)) {
            this.error(s, `subair ${s.subair} hasn't been defined`);
        }

        // TODO: verify if namespace just was declared in this case subair must be the same
        const previous = [this.namespace, this.subair ];
        this.namespace = namespace;
        this.subair = subair;
        this.scope.push();
        this.execute(s.statements);
        this.scope.pop();
        [this.namespace, this.subair ] = previous;
    }
    execSubairDefinition(s) {
        console.log(`subair_DEFINITION ${s.name}`);
        const subair = s.name ?? false;
        if (subair === false) {
            this.error(s, `subair not defined correctly`);
        }
        let rows = [];
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
        this.colDeclaration(s, 'fixed');
    }
    execColDeclaration(s) {
        this.colDeclaration(s, 'im');
    }
    decodeNameAndLengths(s) {
        return [s.name, this.decodeLengths(s)];
    }
    decodeLengths(s) {
        // NAIF TODO
        if (!Array.isArray(s.lengths)) return [];

        let lengths = [];
        for (const length of s.lengths) {
            lengths.push(this.getExprNumber(length));
        }
        return lengths;
    }
    colDeclaration(s, type) {
        for (const col of s.items) {
            const colname = this.getFullName(col);
            console.log(`COL_DECLARATION(${colname}) type:${type}`);
            const lengths = this.decodeLengths(col);
            this.declareReference(colname, type, lengths);
            /// TODO: INIT / SEQUENCE
        }
    }
    declareReference(name, type, lengths = [], data = {}) {
        if (!data.sourceRef) {
            data.sourceRef = this.sourceRef;
        }
        return this.references.declare(name, type, lengths, data);
    }
    execCode(s) {
        this.execute(s.statements);
    }
    execConstraint(s) {
        console.log('********** doConstraint ********** (s.expression:)');
        /* let constraint = {op: 'sub', values: [s.left, s.right]};
        console.log(s);
        this.expressions.toString(constraint);
        let expr = this.expressions.evaluate(constraint, {update: true, Fr: this.Fr});
        console.log('********** doConstraint ********** (expr)');
        this.expressions.toString(expr);
        const eidx = this.addExpression(expr);
        this.constraints.push({fileName: this.relativeFileName, namespace: this.namespace, line: s.first_line, e: eidx});*/

    }
    execVariableIncrement(s) {
        const name = s.name;
        const value = this.references.get(name, []);
        console.log(`VAR ${name} = ${value}`);
        this.references.set(name, [], value + s.pre + s.post);
    }
    execVariableDeclaration(s) {
        const init = typeof s.init !== 'undefined';
        const count = s.items.length;
        console.log(s);

        if (init && s.init.length !== count) {
            this.error(s, `Mismatch between len of variables (${count}) and len of their inits (${s.init.length})`);
        }
        for (let index = 0; index < count; ++index) {
            const [name, lengths] = this.decodeNameAndLengths(s.items[index]);
            const initValue = init ? this.expressions.e2value(s.init[index]) : null;
            this.references.declare(name, 'var', lengths, { type: s.vtype, sourceRef: this.sourceRef });
            console.log(['########################',index, init, initValue],typeof s.init);
            console.log(s.init[index]);
            if (initValue !== null) this.references.set(name, [], initValue);
        }
    }
    execConstantDefinition(s) {
        if (s.sequence) {
            const lengths = this.decodeLengths(s);
            this.references.declare(s.name, 'constant', lengths, { sourceRef: this.sourceRef });
            const seq = new Sequence(this, s.sequence);
            // TODO, check sizes before extends
            const values = seq.extend();
            for (let index = 0; index < values.length; ++index) {
                this.references.set(s.name, [index], values[index]);
            }
        } else {
            this.references.declare(s.name, 'constant', [], { sourceRef: this.sourceRef });
            const value = this.getExprNumber(s.value, s, `constant ${s.name} definition`);
            this.references.set(s.name, [], value);
        }
    }
    getNames(e) {
        return [e.name, this.getFullName(e)];
    }
    getFullName(e) {
        const _namespace = (((e.namespace ?? 'this') === 'this') ? this.namespace : e.namespace);
        const _subair = (((e.subair ?? 'this') === 'this') ? this.subair : e.subair);

        let name = '';
        if (_subair !== '') {
            name += _subair + '::';
        }
        if (_namespace !== '') {
            name = _namespace + '.';
        }
        name += e.name;
        // console.log(`${e.name} ==> ${name}`)
        return name;
    }
    evaluateExpression(e){
        // TODO
        return 0n;
    }
}
