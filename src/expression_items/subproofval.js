const ProofStageItem = require("./proof_stage_item.js");
module.exports = class Subproofval extends ProofStageItem {
    constructor (id, stage) {
        super(id, stage);
    }
    clone() {
        return new Subproofval(this.id, this.stage);
    }
}
