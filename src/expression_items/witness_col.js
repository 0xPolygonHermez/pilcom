const ProofStageItem = require("./proof_stage_item.js");
module.exports = class WitnessCol extends ProofStageItem {
    constructor (id, stage = 1) {
        super(id, stage);
    }
    clone() {
        return new WitnessCol(this.id, this.stage);
    }
}
