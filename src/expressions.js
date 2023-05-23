const util = require('util');
const Router = require('./router.js');
module.exports = class Expressions {

    constructor (Fr, parent, references, publics, constants) {
        this.Fr = Fr;
        this.expressions = [];
        this.references = references;
        this.constants = constants;
        this.parent = parent;
        this.router = new Router(this, 'op', {defaultPrefix: '_eval', multiParams: true});
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

    reserve(n) {
        const fromId = this.expressions.length;
        for (let times = 0; times < n; ++times) {
            this.expressions.push(null);
        }
        return fromId;
    }

    toString(e) {
        console.log(util.inspect(e, false, null, true /* enable colors */))
    }

    // update mode
    ____eval(e, fr = false) {
        if (e.op in this.operations) {
            const operation = this.operations[e.op];
            const [a,b,reduced] = this.evaluateValues(e, operation.args, fr);
            if (reduced) {
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
    eval(e) {
        let expr = e.expr;
        return expr.eval(this);
        let values = new Array(expr.stack.length);
        let top = expr.stack.length-1;
        this.eval2(expr, top, values);
        console.log(values[top]);
        return values[top];
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
    evalRuntime(e) {
        return this.router.go([e, this.Fr]);
    }
    _evalString(e) {
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
        return this.parent.execCall(e);
    }
    evalReference(e) {
        const ref = this.resolveReference(e);
        console.log(ref);
        EXIT_HERE;
    }
    _evalReference(e) {
        const ref = this.resolveReference(e);
        let res = ref;
        switch (ref.type) {
            case 'witness':
            case 'fixed':
            case 'im':
                // TODO: review next, prior


                    // intermediate column was an expression
/*                                const im = this.get(id);
                    console.log(e);
                    console.log([polname, ref, id]);
                    console.log(['IM', im, id]);
                    let refexp = this.evaluate(im, mode);
                    this.reduceExpressionTo1(refexp);
                    this.update(id, refexp); */
                    // e.deg = refexp.deg;
                    res = ref;
            case 'fe':
                res = { op: 'number', value: BigInt(ref.value) };
                break;
            case 'constant':
            case 'int':
                res = BigInt(ref.value);
                break;
            default:
                console.log(e);
                console.log(ref);
                throw new Error(`Invalid reference type: ${ref.type}`);
        }
        return res;
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
    resolveReference(e) {
        const names = this.parent.getNames(e);

        let options = {};
        if (e.inc === 'pre') {
            options.preDelta = 1n;
        }
        if (e.inc === 'post') {
            options.postDelta = 1n;
        }
        if (e.dec === 'pre') {
            options.preDelta = -1n;

        }
        if (e.dec === 'post') {
            options.postDelta = -1n;
        }
        return this.references.getTypedValue(names, e.__indexes, options);
    }
    getReferenceInfo(e, options) {
        const names = this.parent.getNames(e.getAloneOperand());
        console.log(names);
        return this.references.getTypeInfo(names, e.__indexes, options);
    }
    e2num(expr, s, title = '') {
        let res = this.e2types(e, s, title, ['number','bigint']);
        return BigInt(res.value);
    }
    e2types(e, s, title, types) {
        const res = e.expr.eval(this);
        const restype = typeof res;
        if (types.includes(restype)) {
            return res;
        }

        console.log(res);
        e.expr.dump();
        this.error(s, (title ? ' ':'') + `is not constant expression (${restype}) (2)`);
    }
    e2value(e, s, title = '') {
        return this.e2types(e, s, title, ['number','bigint','string']);
    }
    e2bool(e, s, title = '') {
        let res = this.e2types(e, s, title, ['number','bigint','string']);
        if (typeof res === 'string') {
            return res !== '';
        }
        if (typeof res === 'string') {
            return res != 0n;
        }
        if (typeof res === 'number') {
            return res != 0;
        }
    }
}
