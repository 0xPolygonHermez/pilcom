const {assert, assertLog} = require('./assert.js');
const Expression = require('./expression.js');
const Context = require('./context.js');
module.exports = class Constraints {
    constructor () {
        this.constraints = [];
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
        return Context.expressions.get(this.constraints[id].exprId);
    }

    isDefined(id) {
        return (typeof this.constraints[id] != 'undefined');
    }

    getPackedExpressionId(id, container, options = {}) {
        console.log(Context.expressions);
        console.log(options);
        console.log(id);
        console.log(options.expressions ?? Context.expressions);
        const res = (options.expressions ?? Context.expressions).getPackedExpressionId(id, container, options);
        return res;
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
        console.log(right.eval());
        if (right.asIntDefault(false) !== 0n) {
            left.insert('sub', right);
        }
        // left.simplify();
        const exprId = Context.expressions.insert(left);
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
        console.log(constraint);
        const eid = constraint.exprId;
        // const peid = Context.expressions.getPackedExpressionId(eid);
        const peid = this.getPackedExpressionId(eid, packed, options);
        console.log(peid);
        let info = `INFO ${index}: ${eid} ${peid} ${constraint.sourceRef}`
        options = options ?? {};

        if (packed) {
            info += ' '  + packed.exprToString(peid, {...options, labels: Context.expressions, hideClass: true});
        }
        return info;
    }
}
