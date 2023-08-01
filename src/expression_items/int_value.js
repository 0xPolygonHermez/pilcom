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
}
