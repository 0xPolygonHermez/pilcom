const util = require('util');
const LabelRanges = require('./label_ranges.js');
const Expression = require('./expression.js');
const WitnessCol = require('./expression_items/witness_col.js');
const NonRuntimeEvaluable = require('./non_runtime_evaluable.js');
const ExpressionPack = require('./expression_pack.js');

module.exports = class Expressions {
    constructor () {
        this.expressions = [];
        this.packedIds = [];
        this.labelRanges = new LabelRanges();
        this.expressionPack = new ExpressionPack();
    }
    clone() {
        let cloned = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        cloned.expressions = this.expressions.map(x => x.clone());
        cloned.labelRanges = this.labelRanges.clone();

        return cloned;
    }
    reserve(count, label, multiarray) {
        const id = this.expressions.length;
        for (let times = 0; times < count; ++times) {
            this.expressions.push(null);
        }
        if (label) {
            this.labelRanges.define(label, id, multiarray);
        }
        return id;
    }
    getTypedValue(id, offset, type) {
        assert(offset === 0);
        const res = { type, value: this.expressions[id], id };
        return res;
    }
    get(id) {
        console.log(this.expressions);
        if (this.isDefined(id)) {
            return this.expressions[id];
        }
        return null;
    }

    isDefined(id) {
        return (id in this.expressions);
    }

    define(id, expr) {
        if (this.isDefined(id)) {
            throw new Error(`${id} already defined on ....`);
        }
        this.expressions[id] = expr;
    }

    set(id, expr) {
        this.expressions[id] = expr;
    }

    update(id, expr) {
        this.expressions[id] = expr;
    }

    insert(e) {
        return this.expressions.push(e) - 1;
    }
    __toString(e) {
        console.log(util.inspect(e, false, null, true /* enable colors */))
    }

    // update mode
    ____eval(e, fr = false) {
        if (e.op in this.operations) {
            const operation = this.operations[e.op];
            const [a,b,reduced] = this.evaluateValues(e, operation.args, fr);
            if (reduced) {
                if (typeof a.value !== 'bigint' || typeof b.value !== 'bigint') {
                    throw new Error(`ERROR evaluating operation: ${a.value}[${typeof a.value}] ${operation} on ${b.value}[${typeof b.value}]`);
                }
                return { op: 'number',
                         value: fr ? operation.handleFr(fr, a.value, b.value) : operation.handle(a.value, b.value) };
            }
            if (e.op === 'pow') {
                // TODO: check last Scalar.
                // return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.exp(Fr.e(a.value), Scalar.e(b.value))), first_line: e.first_line}
                this.error(e, "Exponentiation can only be applied between constants");
            }
            return e;
        }
        return this.router.go([e, fr]);
    }
    checkExpression(e) {
        if (typeof e === 'undefined' || e.expr || !(e instanceof Expression)) {
            console.log(e)
            throw new Error(`Invalid eval argument, it must be an Expression`);
        }
        return e;
    }
    eval(e) {
        return this.checkExpression(e).eval();
    }
    evalOperand(operand, values) {
        switch (operand.type) {
            case 0:
                return BigInt(operand.value);
            case 3:
                return this.evalRuntime(operand.value);
        }
        console.log(operand);
        EXIT_HERE;
    }
    evalRuntime(operand, expr, deeply) {
        // TODO: if not runtime evaluable return null or
        const op = operand.op;
        switch (op) {
            case 'string': return this._evalString(operand);
            case 'number': return this._evalNumber(operand);
            case 'call': return this._evalCall(operand);
            case 'idref': return this._evalIdref(operand);
            case 'reference': return this._evalReference(operand, expr, deeply);
        }
        throw new Error(`Invalid runtime operation ${op}`);
    }
    _evalString(e) {
        if (e.template) return Context.processor.evaluateTemplate(e.value);
        return e.value;
    }
    eval2(e, pos, values) {
        let st = e.stack[pos];
        let res;
        switch (st.op) {
            case false:
                res = this.evalOperand(st.operands[0], values)
                break;
            default:
                console.log(st);
                EXIT_HERE;
        }
        values[pos] = res;
    }
    _evalNumber(e, fr) {
        return e;
    }
    _evalCall(e) {
        return Context.processor.execCall(e);
    }
    _evalIdref(e) {
        if (e.array) {
            return e;
        }
        return this.evalReferenceValue(Context.references.getIdRefValue(e.refType, e.id));
    }
    evalReference(e) {
        const ref = this.evalReferenceValue(e);
        console.log(ref);
        EXIT_HERE;
    }
    evalReferenceValue(ref) {
        let res = ref;
        switch (ref.type) {
            case 'fixed':
                // DUAL, if access row was a value, if not it's an id
                // TODO
                if (typeof res.row === 'undefined') {
                    res = {refType: 'fixed', id: res.id};
                } else {
                    // e.parent.fixedRowAccess = true;
                    res = res.value.getValue(res.row);
                }
                if (ref.next) res.next = ref.next;
                break;
            case 'challenge':
                res = {refType: ref.type, id: ref.id };
                break;
            case 'witness':
                if (res.value instanceof WitnessCol) {
                    res = {refType: ref.type, id: res.value.id };
                    if (ref.next) res.next = ref.next;
                }
                break;
            case 'public':
            case 'proofvalue':
            case 'subproofvalue':
                res = {refType: ref.type, id: res.id };
                break;
            case 'im':
                // TODO: review next, prior
                res = {...res, value: res.id};
                break;
            case 'fe':
                res = { op: 'number', value: BigInt(ref.value) };
                break;
            case 'constant':
                if (!res.array) {
                    res = (typeof ref.value === 'number' ? BigInt(ref.value) : ref.value);
                }
                break;
            case 'int':
                res = (typeof ref.value === 'number' ? BigInt(ref.value) : ref.value);
                break;
            case 'string':
                res = (typeof ref.value === 'string' ? ref.value : '');
                break;
            case 'expr':
                if (ref.value instanceof Expression) {
                    res = ref.value.eval();
                    if (res instanceof Expression) {
                        res = res.instance(true);
                    } else if (res instanceof NonRuntimeEvaluable) {
                        res = ref.value.instance(true);
                    }
                } else {
                    res = ref;
                }
                break;

            default:
                console.log(ref);
                throw new Error(`Invalid reference type: ${ref.type}`);
        }
        return res;
    }
    _evalReference(operand, expr, deeply) {
        return this.evalReferenceValue(this.resolveReference(operand, deeply));
    }
    evaluateValues(e, valuesCount, fr) {
        // TODO: check valuesCount
        const a = this.eval(e.values[0], fr);
        let simple = (a.op === 'number');
        if (valuesCount == 1) {
            return [a, a, simple];
        }
        const b = this.eval(e.values[1], fr);
        simple = simple && (b.op === 'number');

        return [a, b, simple];
    }

    *[Symbol.iterator]() {
        for (let expr of this.expressions) {
          yield expr;
        }
    }
    error(a, b) {
        console.log(a);
        console.log(b);
        EXIT_HERE;
    }
    getLabel(type, id, options) {
        if (type === 'im') {
            return this.labelRanges.getLabel(id, options);
        }
        return Context.references.getLabel(type, id, options);
    }
    resolveReference(operand, deeply = false) {
        const names = this.context.getNames(operand.name);

        let options = {};
        if (!deeply) {
            if (operand.inc === 'pre') {
                options.preDelta = 1n;
            }
            if (operand.inc === 'post') {
                options.postDelta = 1n;
            }
            if (operand.dec === 'pre') {
                options.preDelta = -1n;

            }
            if (operand.dec === 'post') {
                options.postDelta = -1n;
            }
        }
        let res = Context.references.getTypedValue(names, operand.__indexes, options);
        if (typeof operand.__next !== 'undefined') {
            res.__next = res.next = operand.__next;
        } else if (typeof operand.next !== 'number' && (operand.next || operand.prior)) {
            throw new Error(`INTERNAL: next and prior must be previouly evaluated`);
        } else if (typeof operand.next === 'number' && operand.next) {
            res.next = operand.next;
        }
        return res;
    }
    getReferenceInfo(e, options) {
        const names = this.context.getNames(e.getAloneOperand().name);
        return Context.references.getTypeInfo(names, e.__indexes, options);
    }
    e2num(e, s, title = '') {
        return this.e2types(e, s, title, ['number','bigint']);
    }
    e2number(e, s, title = '') {
        let res = this.e2types(e, s, title, ['number','bigint'], false);
        return Number(res);
    }
    e2types(e, s, title, types, toBigInt = true) {
        // TODO: review specify PRE/POST on expression conversion ==> refactorize !!!
        let res = e;
        if (res instanceof Expression) {
            res = e.eval();
            if (res instanceof Expression) {
                e.dump();
                debugger;
                res = e.eval();
            }
        }
        if (typeof res.value !== 'undefined') {
            // REVIEW, why eval return { type: 'expr', value: 6n, id: 0, next: 0, __next: 0 }  !!!
            res = res.value;
        }
        // console.log(res);
        // const res = e.expr && e.expr instanceof Expression ? e.expr.eval() : e;
        return this.getValueTypes(res, s, title, types, toBigInt);
    }
    getValueTypes(e, s, title, types, toBigInt = true) {
        const etype = typeof e;
        if (types.includes(etype)) {
            return toBigInt && etype === 'number' ? BigInt(e) : e;
        }
        this.error(s, (title ? ' ':'') + `is not constant expression (${etype}) (2)`);
    }
    getValue(e, s, title = '') {
        return this.getValueTypes(e, s, title, ['number','bigint','string']);
    }
    e2value(e, s, title = '') {
        return this.e2types(e, s, title, ['number','bigint','string']);
    }
    e2bool(e, s, title = '') {
        let res = this.e2types(e, s, title, ['number','bigint','string']);
        if (typeof res === 'string') {
            return res !== '';
        }
        if (typeof res === 'bigint') {
            return res != 0n;
        }
        if (typeof res === 'number') {
            return res != 0;
        }
        EXIT_HERE;
    }
    pack(container, options) {
        this.packedIds = [];
        for (let id = 0; id < this.expressions.length; ++id) {
            if (typeof this.packedIds[id] !== 'undefined') continue;    // already packed
            const packedId = this.expressionPack.set(this.expressions[id]).pack(container, options);
            // packedId === false, means directly was a alone term.
            this.packedIds[id] = packedId;
        }
    }
    getPackedExpressionId(id, container, options) {
        if (container && typeof this.packedIds[id] === 'undefined') {
            const packedId = this.expressionPack.set(this.expressions[id]).pack(container, options);
            this.packedIds[id] = packedId;
        }
        return this.packedIds[id];
    }
    instance(e) {
        return e.instance();
    }

    dump(name) {
        for (let index = 0; index < this.expressions.length; ++index) {
            this.expressions[index].dump(`EXPRESSION ${index} # ${name}`, 3);
        }
    }
    clear() {
        this.expressions = [];
        this.packedIds = [];
        this.labelRanges = new LabelRanges();
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.expressions.length; ++index) {
          yield this.expressions[index] ?? false;
        }
    }
}
