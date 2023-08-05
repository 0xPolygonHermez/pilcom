const ProofStageItem = require("./proof_stage_item.js");
module.exports = class Challenge extends ProofStageItem {
    constructor (id, stage) {
        super(id, stage);
    }
    clone() {
        return new Challenge(this.id, this.stage);
    }
}
