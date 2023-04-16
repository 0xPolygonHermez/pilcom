module.exports = class Expression {

    constructor (Fr, parent, references, publics, constants) {
        this.Fr = Fr;
        this.expressions = [];
        this.references = references;
        this.publics = publics;
        this.constants = constants;
        this.parent = parent;
        this.operationHandles = {
            add: (a, b) => this.Fr.add(a, b),
            mul: (a, b) => this.Fr.mul(a, b),
            sub: (a, b) => this.Fr.sub(a, b),
            pow: (a, b) => this.Fr.exp(a, b),
            neg: (a, b) => this.Fr.neg(a),
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

    simplify(id) {
        return this.evaluate(this.get(id), true);
    }

    simplifyExpression(e) {
        return this.evaluate(e);
    }

    evaluate(e, onlySimplify = false) {
        if (e.simplified) return e;

        if (e.op !== 'var') e.simplified = true;

        // if (e.namespace) checkNamespace(e.namespace, ctx);

        switch (e.op) {
            case 'add':
            case 'sub':
            case 'mul':
            case 'pow':
            case 'neg':
                {
                    const valuesCount = e.op === 'neg' ? 1:2;
                    const [a,b,reduced] = this.evaluateValues(e, valuesCount, onlySimplify);
                    if (reduced) {
                        const aValue = this.Fr.e(a.value);
                        const bValue = this.Fr.e(b.value);
                        return this.simplified(this.operationHandles[e.op](aValue, bValue), e);
                    }
                    if (e.op === 'pow') {
                        // TODO: check last Scalar.
                        // return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.exp(Fr.e(a.value), Scalar.e(b.value))), first_line: e.first_line}
                        error(e, "Exponentiation can only be applied between constants");
                    }
                    /* console.log(e);
                    console.log([valuesCount, reduced]);
                    console.log(a);
                    console.log(b);*/
                    e.deg = (e.op === 'mul') ? a.deg + b.deg : Math.max(a.deg, b.deg);
                }
                return e;

            case 'number':
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
                    const polname = e.namespace + '.' + e.name;
                    const ref = this.references.get(polname);
                    if (ref === null) {
                        throw new Error(`Reference ${polname} not found on .....`)
                    }
                    switch (ref.type) {
                        case 'cmP':
                        case 'constP':
                            e.deg = 1;
                            return e;
                        case 'imP':
                            {
                                let refexp = this.evaluate(this.get(ref.id));
                                this.reduceExpressionTo1(refexp);
                                this.update(ref.id, refexp);
                                e.deg = 1
                                // e.deg = refexp.deg;
                                return e;
                            }
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
                // TODO
                // if var not simplified
                return e;
            default:
                console.log(e);
                error(e, `invalid operation: ${e.op}`);
        }
    }

    evaluateValues(e, valuesCount, onlySimplify) {
        // TODO: check valuesCount
        e.values[0] = this.evaluate(e.values[0], onlySimplify);
        const a = e.values[0];
        let simple = a.op === 'number';
        if (valuesCount == 1) {
            return [a, a, simple];
        }
        // console.log('valuesCount');
        // console.log(valuesCount);
        // console.log(e.values);
        e.values[1] = this.evaluate(e.values[1], onlySimplify);
        const b = e.values[1];
        simple = simple && b.op === 'number';
        return [a, b, simple];
    }

    simplified(value, e) {
        return {
                 simplified:true,
                 op: "number",
                 deg:0,
                 value: this.Fr.toString(value),
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
}
