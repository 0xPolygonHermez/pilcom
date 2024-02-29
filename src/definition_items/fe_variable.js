const LabelRanges = require("../label_ranges.js");
const Variable = require("./variable.js");

module.exports = class FeVariable extends Variable {
    constructor (value = 0n) {
        super(value);
    }
    clone() {
        return new FeVariable(this.value);
    }
    asInt() {
        return this.value;
    }
    asNumber() {
        return Number(this.value);
    }
}
