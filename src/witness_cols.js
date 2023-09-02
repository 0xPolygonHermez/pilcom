const Indexable = require("./indexable.js");
const WitnessColItem = require("./expression_items/witness_col.js");
const WitnessCol = require("./definition_items/witness_col.js");
module.exports = class WitnessCols extends Indexable {

    constructor () {
        super('witness', WitnessCol, WitnessColItem);
    }
    getEmptyValue(id, options) {
        let _options = options ?? {};
        return new WitnessCol(id, _options.stage ?? 1);
    }

}
