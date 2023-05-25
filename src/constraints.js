module.exports = class Constraints {

    constructor (Fr, expressions) {
        this.Fr = Fr;
        this.constraints = [];
        this.expressions = expressions;
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
        const id = this.constraints.length;
        if (right.eval(this.expressions) !== 0n) {
            left.insert('sub', right);
        }
        const exprId = this.expressions.insert(left);
        return this.constraints.push({exprId, sourceRef, boundery}) - 1;
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.constraints.length; ++index) {
          yield index;
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
    dump () {
        for (let index = 0; index < this.constraints.length; ++index) {
            console.log(`${index}: ${this.constraints[index]}`);
        }
    }
}
