const ExpressionItem = require("./expression_item.js");

module.exports = class StackItem extends ExpressionItem {
    constructor (offset) {
        super();
        this.offset = offset;
    }
    getOffset() {
        return this.offset;
    }
    setOffset(value) {
        this.offset = value;
        return value;
    }
    clone() {
        return new StackItem(this.offset);
    }
}
