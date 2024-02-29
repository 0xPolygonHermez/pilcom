const ProofItem = require("./proof_item.js");
module.exports = class ProofStageItem extends ProofItem {
    constructor (id, stage) {
        super(id);
        this.stage = stage;
    }
    getStage() {
        return this.stage;
    }
}

