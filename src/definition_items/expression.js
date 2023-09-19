const RuntimeItem = require("./runtime_item.js");
const ExpressionClass = require('../expression.js');
module.exports = class Expression extends RuntimeItem {
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
        this.value._set(value);
        this.value.dump('setValue');
    }
}
