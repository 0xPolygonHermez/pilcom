const {assert, assertLog} = require('../assert.js');
const Variable = require("./variable.js");
const ExpressionItem = require('../expression_items/int_value.js');

class IntVariable extends Variable {
    constructor (value = 0n) {
        if (typeof value === 'object' && typeof value.asInt === 'function') {
            value = value.asInt();
        }
        if (typeof value === 'number') {
            value = BigInt(value);
        }
        assertLog(typeof value === 'bigint', value);
        super(value);
    }
    setValue(value) {
        console.log(value);
        if (typeof value.asInt === 'function') {
            value = value.asInt();
        }
        if (typeof value === 'number') {
            value = BigInt(value);
        }
        assertLog(typeof value === 'bigint', value);
        super.setValue(value);
    }
    clone() {
        return new IntValue(this.value);
    }
    static castTo(value) {
        if (value instanceof IntValue) {
            return value.value;
        }
    }
    getItem() {
        return new ExpressionItem(this.value);
    }
    asInt() {
        return this.value;
    }
    asNumber() {
        return Number(this.value);
    }
}
module.exports = IntVariable;