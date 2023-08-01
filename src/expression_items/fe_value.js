const LabelRanges = require("../label_ranges.js");
const ValueItem = require("./value_item.js");

module.exports = class FeValue extends ValueItem {
    constructor (value = 0n) {
        super(value);
    }
    clone() {
        return new FeValue(this.value);
    }

}
