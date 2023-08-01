const LabelRanges = require("../label_ranges.js");
const ProofItem = require("./proof_item.js");
module.exports = class WitnessCol extends ProofItem {
    constructor (id, stage = 1) {
        super(id);
        this.stage = stage;
    }
    getId() {
        return this.id;
    }
}
