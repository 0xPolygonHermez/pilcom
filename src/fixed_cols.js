const Indexable = require("./indexable.js");
const FixedColItem = require("./expression_items/fixed_col.js");
const FixedCol = require("./definition_items/fixed_col.js");
module.exports = class FixedCols extends Indexable {

    constructor () {
        super('fixed', FixedCol, FixedColItem);
    }
    getEmptyValue(id) {
        return new FixedCol(id);
    }
}
