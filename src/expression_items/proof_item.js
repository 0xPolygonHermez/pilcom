const LabelRanges = require("../label_ranges.js");
const ExpressionItem = require("./expression_item.js");
module.exports = class ProofItem extends ExpressionItem {
    constructor (id) {
        super();
        this.id = id;
    }
}

