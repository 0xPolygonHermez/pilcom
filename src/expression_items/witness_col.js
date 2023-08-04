const ProofItem = require("./proof_item.js");
module.exports = class WitnessCol extends ProofItem {
    constructor (id, stage = 1) {
        super(id);
        this.stage = stage;
    }
    getId() {
        return this.id;
    }
    clone() {
        return new WitnessCol(this.id, this.stage);
    }
}
