const {assert, assertLog} = require("../assert.js");
const RuntimeItem = require("./runtime_item.js");
class StringValue extends RuntimeItem {
    constructor (value = '') {
        super();
        assertLog(typeof value === 'string', value);
        this.value = value;
    }
    get isBaseType () {
        return true;
    }
    toString(options) {
        return '"'+this.value+'"';
    }
    getValue() {
        return this.value;
    }
    setValue(value) {
        assertLog(typeof value === 'string', value);
        this.value = value;
        return this.value;
    }
    asString() {
        return this.value;
    }
    asStringItem() {
        return this.clone();
    }
    clone() {
        return new StringValue(this.value);
    }
    operatorEq(valueB) {
        return new RuntimeItem.IntValue(this.asString() === valueB.asString() ? 1:0);
    }
    operatorAdd(valueB) {
        return new StringValue(this.asString() + valueB.asString());
    }
    eval(options = {}) {
        return this.clone();
    }
}

RuntimeItem.registerClass('StringValue', StringValue);
module.exports = StringValue;
