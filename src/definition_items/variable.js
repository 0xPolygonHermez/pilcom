const RuntimeItem = require("./runtime_item.js");
module.exports = class Variable extends RuntimeItem {
    static directValue = true;
    constructor (id, properties = {}) {
        super(id, properties);
    }
    getValue() {
        return this.value;
    }
    setValue(value) {
        this.value = value;
    }
    toString(options) {
        return `*${this.constructor.name}(${this.value})[${this.value ? this.value.constructor.name : '??'}]`;
    }
    clone() {
        return new ValueItem(this.value);
    }
}
