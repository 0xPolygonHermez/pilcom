const ProofStageItem = require("./proof_stage_item.js");
module.exports = class Challenge extends ProofStageItem {
    constructor (id, data = {}) {
        super(id, data.stage);
        this.sourceRef = data.sourceRef;
        this.label = data.label;
    }
    clone() {
        return new Challenge(this.id, {stage: this.stage, sourceRef: this.sourceRef,
                                       label: (this.label && typeof this.label.clone === 'function') ? this.label.clone(): this.label});
    }
}
