const util = require('util');
const LabelRanges = require('./label_ranges.js');
const Expression = require('./expression.js');
const WitnessCol = require('./expression_items/witness_col.js');
const NonRuntimeEvaluable = require('./non_runtime_evaluable.js');
const ExpressionPacker = require('./expression_packer.js');
const Context = require('./context.js');
module.exports = class Expressions {
    constructor () {
        this.expressions = [];
        this.packedIds = [];
        this.labelRanges = new LabelRanges();
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
        console.log(operand);
        return operand.eval();
        throw new Error(`Invalid runtime operation ${op}`);
    }
    evalReference(e) {
        const ref = this.evalReferenceValue(e);
        console.log(ref);
        EXIT_HERE;
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
    _resolveReference(operand, deeply = false) {
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
    _getReferenceInfo(e, options) {
        const names = this.context.getNames(e.getAloneOperand().name);
        return Context.references.getTypeInfo(names, e.__indexes, options);
    }
    _e2num(e, s, title = '') {
        DEPRECATED;
        return this.e2types(e, s, title, ['number','bigint']);
    }
    _e2number(e, s, title = '') {
        DEPRECATED;
        let res = this.e2types(e, s, title, ['number','bigint'], false);
        return Number(res);
    }
    _e2types(e, s, title, types, toBigInt = true) {
        DEPRECATED;

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
    _getValueTypes(e, s, title, types, toBigInt = true) {
        const etype = typeof e;
        if (types.includes(etype)) {
            return toBigInt && etype === 'number' ? BigInt(e) : e;
        }
        this.error(s, (title ? ' ':'') + `is not constant expression (${etype}) (2)`);
    }
    _getValue(e, s, title = '') {
        return this.getValueTypes(e, s, title, ['number','bigint','string']);
    }
    pack(container, options) {
        this.packedIds = [];
        const packer = new ExpressionPacker();
        for (let id = 0; id < this.expressions.length; ++id) {
            if (typeof this.packedIds[id] !== 'undefined') continue;    // already packed
            this.expressions[id].dump('PACK-EXPRESSION ');
            packer.set(container, this.expressions[id]);
            this.packedIds[id] = packer.pack(options);
            // packedId === false, means directly was a alone term.
        }
    }
    getPackedExpressionId(id, container, options) {
        console.log(id, this.packedIds, this.packedIds[id]);
        if (container && typeof this.packedIds[id] === 'undefined') {
            const packer = new ExpressionPacker(container, this.expressions[id]);
            this.packedIds[id] = packer.pack(options);
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
    clear(label = '') {
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
