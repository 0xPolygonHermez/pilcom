const {assert, assertLog} = require('../assert.js');
const ValueItem = require("./value_item.js");

module.exports = class IntValue extends ValueItem {
    constructor (value = 0n) {
        if (value instanceof IntValue) {
            value = value.value;
        }
        if (typeof value === 'number') {
            value = BigInt(value);
        }
        assertLog(typeof value === 'bigint', value);
        super(value);
    }
    setValue(value) {
        if (typeof value === 'number') {
            value = BigInt(value);
        }
        assert(typeof value === 'bigint');
        this.value = value;
    }
    clone() {
        return new IntValue(this.value);
    }
    static castTo(value) {
        if (value instanceof IntValue) {
            return value.value;
        }
        if (typeof value.asInt === 'function') {
            return value.asInt();
        }
        console.log(value);
        EXIT_HERE;
    }
    asInt() {
        return this.value;
    }
    asNumber() {
        return Number(this.value);
    }
}
