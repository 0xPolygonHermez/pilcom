const RuntimeItem = require("./runtime_item.js");
module.exports = class Variable extends RuntimeItem {
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
