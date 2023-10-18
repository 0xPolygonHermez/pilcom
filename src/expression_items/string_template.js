const {assert, assertLog} = require("../assert.js");
const RuntimeItem = require("./runtime_item.js");
const StringValue = require("./string_value.js");
const Context = require('../context.js');

class StringTemplate extends StringValue {
    evalTemplate(options) {
        console.log('BEFORE TEMPLATE');
        const res = new StringValue(Context.processor.evaluateTemplate(this.value));
        console.log('AFTER TEMPLATE');
        return res;
    }
    toString(options) {
        return '"'+this.evalTemplate(options)+'"';
    }
    getValue() {
        return this.evalTemplate();
    }
    asString() {
        return this.asStringItem().value;
    }
    asStringItem() {
        return this.evalTemplate();
    }
    eval(options = {}) {
        return this.evalTemplate(options);
    }
}

RuntimeItem.registerClass('StringTemplate', StringTemplate);
module.exports = StringTemplate;
