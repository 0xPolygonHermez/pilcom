const Expression = require("./expression.js");
const Context = require('./context.js');
const {assert, assertLog} = require('./assert.js');

module.exports = class Assign {
    constructor () {
    }

    assign (name, indexes, value) {
        // console.log(value.stack[0].operands[0]);
        const _value = value.eval();
        if (typeof _value !== 'undefined' && _value !== null) {
            value = _value;
        }
        assert(value !== null);
        return this.__assign(name, indexes, value);
    }
    __assign(name, indexes, value) {
        const [type, reference, array] = Context.references.getTypeR(name, indexes);
        console.log([type, reference, array]);
        const dim = (array && array.dim) ? array.dim : 0;
        if (dim > 0) {
            return this.assignArray(name, indexes, value, array);
        }
        // console.log([name, type, reference, array]);
        return this.assignType(type, name, indexes, value);
    }
    assignType(type, name, indexes, value) {
        console.log(type);
        switch (type) {
            case 'int': return this.assignTypeInt(name, indexes, value, type);
            case 'expr': return this.assignTypeExpr(name, indexes, value, type);
        }
    }
    assignArray(name, indexes, value, array) {
        const ref = value.getAloneOperand();
        let valueIndexes = value.__indexes ?? [];
        const def = Context.references.getDefinition(ref.name);

        if (array.dim != def.array.dim) {
            throw new Error(`different array dimension on asignation ${array.dim} vs ${def.array.dim}`);
        }
        this.assignArrayLevel(0, name, indexes, value, def.array, array);
        // array.lengths[0] != def.array.lengths[0]) {
    }
    assignArrayLevel(level, name, indexes, value, leftArray, rightArray) {
        // console.log(['assignArrayLevel', level, name, indexes]);
        const len = leftArray.lengths[level];
        for (let index = 0; index < len; ++index) {
            let _indexes = [...indexes];
            _indexes.push(index);
            value.pushAloneIndex(index);
            if (level + 1 === leftArray.dim) {
                this.__assign(name, _indexes, value.evaluateAloneReference());
            } else {
                this.assignArrayLevel(level+1, name, _indexes, value, leftArray, rightArray);
            }
            value.popAloneIndex();
        }
    }
    assignReference (name, value) {
        Context.references.setReference(name, value);
    }
    assignTypeInt(name, indexes, value, type) {
        // TODO: WARNING: e2value an extra evaluation
        const v = Expression.getValue(value);
        if (typeof v === 'number' || typeof v === 'bigint') {
            return Context.references.set(name, indexes, v);
        }
    }
    assignTypeExpr(name, indexes, value, type) {
        if (!(value instanceof Expression)) {
            Context.references.set(name, indexes, value);
            return;
        }
        value = value.instance(true);
        if (Context.sourceRef === 'std_sum.pil:195') {
            console.log('XXX');
        }
        console.log(`ASSIGN ${Context.sourceRef} ${value}`);
        Context.references.set(name, indexes, value);
    }
}
