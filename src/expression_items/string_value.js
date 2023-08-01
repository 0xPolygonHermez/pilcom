const {assert, assertLog} = require("../assert.js");
const RuntimeItem = require("./runtime_item.js");

module.exports = class StringValue extends RuntimeItem {
    constructor (value = '') {
        super();
        assertLog(typeof value === 'string', value);
        this.value = value;
    }
    getValue() {
        return this.value;
    }
    setValue(value) {
        assert(typeof value === 'string')
        this.value = value;
        return this.value;
    }
}
