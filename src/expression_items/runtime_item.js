const LabelRanges = require("../label_ranges.js");
const ExpressionItem = require("./expression_item.js");
module.exports = class RuntimeItem extends ExpressionItem {
    constructor(debug = {}) {
        super(debug);
    }
    runtimeEvaluable() {
        return true;
    }
}

