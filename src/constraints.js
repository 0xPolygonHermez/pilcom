const {assert, assertLog} = require('./assert.js');
const Expression = require('./expression.js');
module.exports = class Constraints {

    constructor (Fr, expressions) {
        this.Fr = Fr;
        this.constraints = [];
        this.expressions = expressions;
    }

    clone() {
        let cloned = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        cloned.constraints = [];
        for (const constraint of this.constraints) {
            cloned.constraints.push({...constraint});
        }
        return cloned;
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

    getPackedExpressionId(id, container, options) {
        return this.expressions.getPackedExpressionId(id, container, options);
    }
    define(left, right, boundery, sourceRef) {
        console.log(left, right);
        assertLog(left instanceof Expression, left);
        assertLog(right instanceof Expression, right);
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
        // left.simplify();
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
    getDebugInfo(index, packed, options) {
        const constraint = this.constraints[index];
        const eid = constraint.exprId;
        const peid = this.expressions.getPackedExpressionId(eid);
        let info = `INFO ${index}: ${eid} ${peid} ${constraint.sourceRef}`
        options = options ?? {};

        if (packed) {
            info += ' '  + packed.exprToString(peid, {...options, labels: this.expressions, hideClass: true});
        }
        return info;
    }
}
