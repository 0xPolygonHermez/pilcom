const LabelRanges = require("./label_ranges.js");
const Indexable = require("./indexable.js");
const WitnessCol = require("./expression_items/witness_col.js");
module.exports = class WitnessCols extends Indexable {

    constructor () {
        super('witness');
    }
}
