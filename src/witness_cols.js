const LabelRanges = require("./label_ranges.js");
const Indexable = require("./indexable.js");
const WitnessCol = require("./pil_items/witness_col.js");
module.exports = class WitnessCols extends Indexable {

    constructor (Fr) {
        super(Fr, 'witness');
    }

    getEmptyValue(id) {
        return new WitnessCol(id);
    }
/*
    set(id, offset, value) {
        console.log([`SET@${this.type}[${id}]`, value]);
        this.values[id] = value;
    }*/
}
