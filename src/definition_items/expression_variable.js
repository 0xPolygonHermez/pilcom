const Variable = require("./variable.js");
const ExpressionClass = require('../expression.js');
module.exports = class ExpressionVariable extends Variable {
    constructor (id, properties = {}) {
        super(id, properties);
        this.value = new ExpressionClass();
    }
    setValue(value) {
        super.setValue(value);
        if (value instanceof ExpressionClass) {
            this.value = value.clone();
            return;
        }
        console.log(value);
        this.value._set(value);
        this.value.dump('setValue');
    }
}
