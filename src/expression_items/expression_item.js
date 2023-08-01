const LabelRanges = require("../label_ranges.js");
module.exports = class ExpressionItem {
    dump(options) {
        return `${this.constructor.name}()`;
    }
    get type() {
        console.log(this);
        NO_USE_TYPE_PROPERTY;
    }
}
