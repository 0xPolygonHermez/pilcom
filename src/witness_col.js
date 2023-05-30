const LabelRanges = require("./label_ranges.js");
module.exports = class WitnessCol {
    constructor (id, stage = 1) {
        this.id = id;
        this.stage = stage;
    }
    getId() {
        return this.id;
    }
}
