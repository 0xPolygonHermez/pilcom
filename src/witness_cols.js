const LabelRanges = require("./label_ranges.js");
const Indexable = require("./indexable.js");
const WitnessCol = require("./witness_col.js");
module.exports = class WitnessCols extends Indexable {

    constructor (Fr) {
        super(Fr, 'fixed');
    }

    getEmptyValue(id, index) {
        return new WitnessCol(id);
    }

    get(id, offset) {
        return this.values[id + offset]
    }

    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
    }

    getTypedValue(id, offset) {
        const res = { type: this.type, value: this.values[id + offset] };
        return res;
    }

    isDefined(id) {
        return (typeof this.values[id] != 'undefined')
    }

    define(id, value) {
        if (this.isDefined(id)) {
            throw new Error(`${id} already defined on ....`)
        }
        this.set(id, 0, value);
    }

    set(id, offset, value) {
        console.log([`SET@${this.type}[${id}]`, value]);
        this.values[id] = value;
    }
}
