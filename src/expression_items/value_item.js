const ExpressionItem = require("./expression_item.js");

module.exports = class ValueItem extends ExpressionItem {
    static directValue = true;
    constructor (value) {
        super();
        this.value = value;
    }
    getValue() {
        return this.value;
    }
    setValue(value) {
        this.value = value;
    }
    dump() {
        return `${this.constructor.name}(${this.value})`;
    }
    clone() {
        return new ValueItem(this.value);
    }
}
