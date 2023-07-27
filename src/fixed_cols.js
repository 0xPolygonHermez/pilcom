const LabelRanges = require("./label_ranges.js");
const Indexable = require("./indexable.js");
const FixedCol = require("./pil_items/fixed_col.js");
module.exports = class FixedCols extends Indexable {

    constructor (Fr) {
        super(Fr, 'fixed');
    }

    getEmptyValue(id, index) {
        return new FixedCol(id);
    }

    get(id, offset) {
        return this.values[id + offset]
    }

    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
    }

    getTypedValue(id, offset = 0) {
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

    set(id, value, control) {
        if (control) {
            EXIT_HERE_ONLY_TWO_PARAMETERS;
        }
        // console.log([`SET@${this.type}[${id}]`, value]);
        this.values[id].set(value);
    }
}
