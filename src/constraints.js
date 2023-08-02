module.exports = class Constraints {

    constructor (Fr, expressions) {
        this.Fr = Fr;
        this.constraints = [];
        this.expressions = expressions;
    }

    dup() {
        let dup = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        dup.constraints = [...this.constraints];
        return dup;
    }

    get(id) {
        return this.constraints[id];
    }

    getExpr(id) {
        return this.expressions.get(this.constraints[id].exprId);
    }

    isDefined(id) {
        return (typeof this.constraints[id] != 'undefined');
    }

    define(left, right, boundery, sourceRef) {
        if (left.isRuntime()) {
            left.dump('LEFT  CONSTRAINT');
            throw new Error(`left constraint has runtime no resolved elements`);
        }
        if (right.isRuntime()) {
            right.dump('RIGHT CONSTRAINT');
            throw new Error(`right constraint has runtime no resolved elements`);
        }
        if (left.fixedRowAccess || right.fixedRowAccess) {
            console.log('\x1B[31mWARNING: accessing fixed row acces\x1b[0m');
        }
        const id = this.constraints.length;
        if (right.eval() !== 0n) {
            left.insert('sub', right);
        }
        left.simplify();
        const exprId = this.expressions.insert(left);
        return this.constraints.push({exprId, sourceRef, boundery}) - 1;
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.constraints.length; ++index) {
          yield this.constraints[index];
        }
    }

    *values() {
        for (let value of this.constraints) {
            yield value;
        }
    }

    *keyValues() {
        for (let index = 0; index < this.constraints.length; ++index) {
            yield [index, this.constraints[index]];
        }
    }
    dump (packed) {
        console.log('CONSTRAINTS');
        for (let index = 0; index < this.constraints.length; ++index) {
            console.log(this.getDebugInfo(index, packed));
        }
    }
    getDebugInfo(index, packed) {
        const constraint = this.constraints[index];
        const eid = constraint.exprId;
        const peid = this.expressions.getPackedExpressionId(eid);
        let info = `INFO ${index}: ${eid} ${peid} ${constraint.sourceRef}`

/*        if (packed) {
            info += ' '  + packed.exprToString(peid, {labels: this.expressions, hideClass: true});
        }*/
        return info;
    }
}
