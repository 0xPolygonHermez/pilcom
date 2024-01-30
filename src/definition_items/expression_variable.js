const Variable = require("./variable.js");
const ExpressionClass = require('../expression_class.js');
const Debug = require('../debug.js');
const ValueItem = require('../expression_items/value_item.js');
const util = require('util');
const {assert, assertLog} = require('../assert.js');
module.exports = class ExpressionVariable extends Variable {
    constructor (id, properties = {}) {
        super(id, properties);
        this.value = new (ExpressionClass.get());
    }
    setValue(value) {
        if (Debug.active) {
            console.log('================================================================');
            console.log(util.inspect(value, false, 10, true));
            console.log('================================================================');
        }
        // super.setValue(value);
        if (typeof value.instance === 'function') {
            assert(value.stack.length > 0);
            this.value = value.instance();
            return;
        }
        if (Debug.active) console.log(value);
        this.value = value.clone();
        /*
        if (value instanceof ExpressionClass || value instanceof ValueItem) {
            this.value = value.clone();
            return;
        }
        console.log(this);
        console.log(this.value);
        console.log(value);
        this.value.set(value);
        // this.value._set(value);
        this.value.dump('setValue');*/
    }
}
