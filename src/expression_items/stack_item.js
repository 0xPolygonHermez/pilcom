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
    getAbsolutePos(currentPos) {
        return currentPos - this.offset;
    }
    cloneInstance() {
        return new StackItem(this.offset);
    }
    dump(options = {}) {
        if (typeof options.pos == 'number') {
            return `StackItem(#${options.pos- this.offset}/${this.offset})`
        }
        return `StackItem(${this.offset})`;
    }
    eval(options = {}) {

    }
}
