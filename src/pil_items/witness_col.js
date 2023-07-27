const LabelRanges = require("../label_ranges.js");
const PilItem = require("../pil_item.js")
module.exports = class WitnessCol extends PilItem {
    constructor (id, stage = 1) {
        super(id);
        this.stage = stage;
    }
    getId() {
        return this.id;
    }
}
