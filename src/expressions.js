const util = require('util');
const Router = require('./router.js');
module.exports = class Expressions {

    constructor (Fr, parent, references, publics, constants) {
        this.Fr = Fr;
        this.expressions = [];
        this.references = references;
        this.constants = constants;
        this.parent = parent;
        this.operations = {
            mul:  { type: 'arith',   args: 2, handle: (a, b) => a * b,  handleFr: (Fr, a, b) => Fr.mul(a, b)},
            add:  { type: 'arith',   args: 2, handle: (a, b) => a + b,  handleFr: (Fr, a, b) => Fr.add(a, b)},
            sub:  { type: 'arith',   args: 2, handle: (a, b) => a - b,  handleFr: (Fr, a, b) => Fr.sub(a, b)},
            pow:  { type: 'arith',   args: 2, handle: (a, b) => a ** b, handleFr: (Fr, a, b) => Fr.pow(a, b)},
            neg:  { type: 'arith',   args: 1, handle: (a) => -a,        handleFr: (Fr, a) => Fr.neg(a, b)},
            gt:   { type: 'cmp',     args: 2, handle: (a, b) => a > b },
            ge:   { type: 'cmp',     args: 2, handle: (a, b) => a >= b},
            lt:   { type: 'cmp',     args: 2, handle: (a, b) => a < b },
            le:   { type: 'cmp',     args: 2, handle: (a, b) => a <= b},
            eq:   { type: 'cmp',     args: 2, handle: (a, b) => a == b},
            ne:   { type: 'cmp',     args: 2, handle: (a, b) => a != b},
            and:  { type: 'logical', args: 2, handle: (a, b) => a && b},
            or:   { type: 'logical', args: 2, handle: (a, b) => a || b},
            not:  { type: 'logical', args: 1, handle: (a) => !a},
            shl:  { type: 'bit',     args: 2, handle: (a, b) => a << b},
            shr:  { type: 'bit',     args: 2, handle: (a, b) => a >> b},
            band: { type: 'bit',     args: 2, handle: (a, b) => a & b },
            bor:  { type: 'bit',     args: 2, handle: (a, b) => a | b },
            bxor: { type: 'bit',     args: 2, handle: (a, b) => a ^ b },
        }
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
            throw new Error(`%{id} already defined on ....`);
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
/*
    simplify(id) {
        return this.evaluate(this.get(id), {update: true, Fr: this.Fr});
    }

    simplifyExpression(e) {
        return this.evaluate(e , {update: true, Fr: this.Fr});
    }
*/
    toString(e) {
        console.log(util.inspect(e, false, null, true /* enable colors */))
    }
    // update mode
    eval(e, fr = false) {
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
    _evalNumber(e, fr) {
        return e;
    }
    _evalCol(e) {
        const ref = this.resolveReference(e);
        console.log(ref);
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
                    return ref;
            case 'fe':
                return {
                    op: 'number',
                    value: BigInt(ref.value),
                }
            case 'constant':
            case 'int':
                return {
                    op: 'number',
                    value: BigInt(ref.value),
                }
            default:
                console.log(e);
                console.log(ref);
                throw new Error(`Invalid reference type: ${ref.type}`);
        }
    }
/*    __() {
        switch (e.op) {
            case 'number':
                e.deg = 0;
                return e;

            case 'constant':
                const value = this.constants.get(e.name);
                if (value === null) {
                    throw new Error(`Constant ${e.name} not found on ....`);
                }
                return this.simplified(value, e);

            case 'col':
                {
                    }
                }
            case 'public':
                {
                    const ref = this.references.get(e.name);
                    if (ref === null) {
                        throw new Error(e, `public ${e.name} not defined`);
                    }
                    if (ref.type !== 'public') {
                        throw new Error(e, `public ${e.name} not defined`);
                    }
                    e.id = ref.id;
                    e.deg = 0;
                    return e;
                }
            case 'var':
                console.log(e);
                EXIT_HERE;

            default:
                console.log(e);
                this.error(e, `invalid operation: '${e.op}'`);
        }
    }
*/
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

/*    simplified(value, e, mode) {
        return {
                 simplified:true,
                 op: "number",
                 deg:0,
                 value: mode.Fr ? mode.Fr.e(value) : BigInt(value),
                 first_line: e.first_line
               }
    }*/

    *[Symbol.iterator]() {
        for (let expr of this.expressions) {
          yield expr;
        }
    }
    error(a, b) {
        console.log(a);
        console.log(b);
        // EXIT_HERE;
    }
    getPolReference(e) {
        const polname = this.parent.getFullName(e)
        const ref = this.references.get(polname);
        return polname + (typeof e.idxExp === 'undefined' ? '':`[${this.e2num(e.idxExp)}]`);
    }
    resolveReference(e) {
        const names = this.parent.getNames(e);
        return this.references.getTypedValue(names);
/*
        let id = ref.id ?? 0;
        if (ref.isArray) {
            const index = this.e2num(e.idxExp);
            if (index >= ref.len) {
                throw new Error(`${polname}[${index}] out of range (len:${ref.len})`);
            }
            id += index;
        }
        return [polname, ref, id];*/
    }
    e2num(expr, s, title = false) {
        const se = this.eval(expr);
        if (se.op !== 'number') {
            this.error(s, title + ' is not constant number expression');
        }
        return BigInt(se.value);
    }
    e2value(expr, s, title = false) {
        const se = this.eval(expr);
        if (se.op !== 'number' && se.op !== 'bool') {
            console.log(se);
            EXIT_HERE;
            this.error(s, title + ' is not constant expression');
        }
        return se.value;
    }
}
