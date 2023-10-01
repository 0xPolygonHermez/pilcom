const ExpressionItem = require("./expression_item.js");
module.exports = class ValueItem extends ExpressionItem {
    static directValue = true;
    constructor (value) {
        super();
        this.value = value;
    }
    get isBaseType () {
        return true;
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
    cloneInstance() {
        const cloned = new ValueItem(this.value);
        cloned.clonenNonConstructorProperties(this);

    }
    asString() {
        return this.value.toString();
    }
    asStringType() {
        return new ExpressionItem.StringValue(this.asString());
    }
    eval(options = {}) {
        return this.clone();
    }
    toString() {
        return `${this.value}`;
    }
}
