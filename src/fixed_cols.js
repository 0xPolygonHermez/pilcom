const Indexable = require("./indexable.js");
const FixedCol = require("./expression_items/fixed_col.js");
module.exports = class FixedCols extends Indexable {

    constructor () {
        super('fixed', FixedCol);
    }
}
