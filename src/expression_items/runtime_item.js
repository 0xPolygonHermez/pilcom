const LabelRanges = require("../label_ranges.js");
const ExpressionItem = require("./expression_item.js");
module.exports = class RuntimeItem extends ExpressionItem {
    constructor(options = {}) {
        super(options);
    }
    isRuntimeEvaluable() {
        return true;
    }
}

