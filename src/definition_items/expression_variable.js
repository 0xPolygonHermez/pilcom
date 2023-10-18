const Variable = require("./variable.js");
const ExpressionClass = require('../expression.js');
const ValueItem = require('../expression_items/value_item.js');
module.exports = class ExpressionVariable extends Variable {
    constructor (id, properties = {}) {
        super(id, properties);
        this.value = new ExpressionClass();
    }
    setValue(value) {
        super.setValue(value);
        if (value instanceof ExpressionClass) {
            this.value = value.instance();
            return;
        }
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
