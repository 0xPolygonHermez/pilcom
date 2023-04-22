const util = require('util');
module.exports = class Expressions {

    constructor (Fr, parent, references, publics, constants) {
        this.Fr = Fr;
        this.expressions = [];
        this.references = references;
        this.publics = publics;
        this.constants = constants;
        this.parent = parent;
        this.operations = {
            add:  { type: 'arith',   result: 'number', args: 2, handle: (a, b) => a + b,  handleFr: (Fr, a, b) => Fr.add(a, b)},
            mul:  { type: 'arith',   result: 'number', args: 2, handle: (a, b) => a * b,  handleFr: (Fr, a, b) => Fr.mul(a, b)},
            sub:  { type: 'arith',   result: 'number', args: 2, handle: (a, b) => a - b,  handleFr: (Fr, a, b) => Fr.sub(a, b)},
            pow:  { type: 'arith',   result: 'number', args: 2, handle: (a, b) => a ** b, handleFr: (Fr, a, b) => Fr.pow(a, b)},
            neg:  { type: 'arith',   result: 'number', args: 1, handle: (a) => -a,        handleFr: (Fr, a) => Fr.neg(a, b)},
            gt:   { type: 'cmp',     result: 'bool',   args: 2, handle: (a, b) => a > b },
            ge:   { type: 'cmp',     result: 'bool',   args: 2, handle: (a, b) => a >= b},
            lt:   { type: 'cmp',     result: 'bool',   args: 2, handle: (a, b) => a < b },
            le:   { type: 'cmp',     result: 'bool',   args: 2, handle: (a, b) => a <= b},
            eq:   { type: 'cmp',     result: 'bool',   args: 2, handle: (a, b) => a == b},
            ne:   { type: 'cmp',     result: 'bool',   args: 2, handle: (a, b) => a != b},
            and:  { type: 'logical', result: 'bool',   args: 2, handle: (a, b) => a && b},
            or:   { type: 'logical', result: 'bool',   args: 2, handle: (a, b) => a || b},
            not:  { type: 'logical', result: 'bool',   args: 1, handle: (a) => !a},
            shl:  { type: 'bit',     result: 'number', args: 2, handle: (a, b) => a << b},
            shr:  { type: 'bit',     result: 'number', args: 2, handle: (a, b) => a >> b},
            band: { type: 'bit',     result: 'number', args: 2, handle: (a, b) => a & b },
            bor:  { type: 'bit',     result: 'number', args: 2, handle: (a, b) => a | b },
            bxor: { type: 'bit',     result: 'number', args: 2, handle: (a, b) => a ^ b },
        }
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
    simplify(id) {
        return this.evaluate(this.get(id), {update: true, Fr: this.Fr});
    }

    simplifyExpression(e) {
        return this.evaluate(e , {update: true, Fr: this.Fr});
    }

    toString(e) {
        console.log(util.inspect(e, false, null, true /* enable colors */))
    }
    // update mode
    evaluate(e, mode = {}) {

        // if (e.simplified) return e;

        // if (e.op !== 'var') e.simplified = true;

        // if (e.namespace) checkNamespace(e.namespace, ctx);
        if (e.op in this.operations) {
            const operation = this.operations[e.op];
            const [a,b,reduced] = this.evaluateValues(e, operation.args, mode);
            if (reduced) {
                const result = {
                    simplified: true,
                    op: (operation.type === 'cmp' || operation.type === 'logical') ? 'bool':'number',
                    deg:0,
                    value: mode.fr ? operation.handleFr(mode.fr, a.value, b.value) : operation.handle(a.value, b.value),
                    first_line: e.first_line
                };
                return result;
            }
            if (e.op === 'pow') {
                // TODO: check last Scalar.
                // return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.exp(Fr.e(a.value), Scalar.e(b.value))), first_line: e.first_line}
                error(e, "Exponentiation can only be applied between constants");
            }
            if (operation.type !== 'arith') {
                error(e, "Only arithmetic operations could be stored as expression");
            }
            /* console.log(e);
            console.log([valuesCount, reduced]);
            console.log(a);
            console.log(b);*/
            e.deg = (e.op === 'mul') ? a.deg + b.deg : Math.max(a.deg, b.deg);
            return e;
        }
        switch (e.op) {
            case 'number':
                e.deg = 0;
                return e;

            case 'bool':
                e.deg = 0;
                return e;

            case 'constant':
                const value = this.constants.get(e.name);
                if (value === null) {
                    throw new Error(`Constant ${e.name} not found on ....`);
                }
                return this.simplified(value, e);

            case 'pol':
                {
                    const [polname, ref, id] = this.resolveReference(e);
                    switch (ref.type) {
                        case 'cmP':
                        case 'constP':
                            e.deg = 1;
                            return e;
                        case 'imP':
                            {
                                let refexp = this.evaluate(this.get(id), mode);
                                this.reduceExpressionTo1(refexp);
                                this.update(id, refexp);
                                e.deg = 1
                                // e.deg = refexp.deg;
                                return e;
                            }
                        case 'var':
                            console.log('REF:');
                            console.log(ref);
                            return {
                                simplified: false,
                                op: "number",
                                deg:0,
                                value: ref.value,
                                first_line: e.first_line
                            }
                            // return this.simplified(ref.value, e);

                        default:
                            throw new Error(`Invalid reference type: ${ref.type}`);
                    }
                }
            case 'public':
                {
                    const ref = this.publics.get(e.name);
                    if (ref === null) {
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
                error(e, `invalid operation: ${e.op}`);
        }
    }

    evaluateValues(e, valuesCount, mode) {
        // TODO: check valuesCount
        const a = this.evaluate(e.values[0], mode);
        if (mode.update) e.values[0] = a;
        let simple = (a.op === 'number' || a.op === 'bool');
        if (valuesCount == 1) {
            return [a, a, simple];
        }
        // console.log('valuesCount');
        // console.log(valuesCount);
        // console.log(e.values);
        const b = this.evaluate(e.values[1], mode);
        if (mode.update) e.values[1] = b;
        simple = simple && (b.op === 'number' || b.op === 'bool');

        return [a, b, simple];
    }

    simplified(value, e, mode) {
        return {
                 simplified:true,
                 op: "number",
                 deg:0,
                 value: mode.Fr ? mode.Fr.e(value) : BigInt(value),
                 first_line: e.first_line
               }
    }
    reduceTo1(id) {
        this.reduceExpressionTo1(this.get(id));
    }
    reduceTo2(id) {
        this.reduceExpressionTo2(this.get(id));
    }
    reduceExpressionTo2(e) {
        if (e.deg>2) this.error(e, `Degre ${e.deg} too high (ReduceTo2)`);
    }

    reduceExpressionTo1(e) {
        if (e.deg <= 1) return;
        if (e.deg > 2) this.error(e, `Degre ${e.deg} too high (ReduceTo1)`);
        e.idQ = this.parent.getNewIdQ();
        e.deg = 1;
    }

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
        const polname = this.parent.getFullName(e)
        const ref = this.references.get(polname);
        if (ref === null) {
            throw new Error(`Reference ${polname} not found on .....`);
        }
        let id = ref.id ?? 0;
        if (ref.isArray) {
            const index = this.e2num(e.idxExp);
            if (index >= ref.len) {
                throw new Error(`${polname}[${index}] out of range (len:${ref.len})`);
            }
            id += index;
        }
        return [polname, ref, id];
    }
    e2num(expr, s, title = false) {
        const se = this.evaluate(expr);
        if (se.op !== 'number') {
            this.error(s, title + ' is not constant number expression');
        }
        return BigInt(se.value);
    }
    e2value(expr, s, title = false) {
        const se = this.evaluate(expr);
        if (se.op !== 'number' && se.op !== 'bool') {
            console.log(se);
            EXIT_HERE;
            this.error(s, title + ' is not constant expression');
        }
        return se.value;
    }
}
