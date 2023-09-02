const ProofStageItem = require("./proof_stage_item.js");
const {assert, assertLog} = require('../assert.js');
module.exports = class WitnessCol extends ProofStageItem {
    constructor (id, stage = 1) {
        assert(typeof id !== 'undefined');
        super(id, stage);
        console.log('CONSTRUCTOR_WITNESS', id, this.id);
    }
    clone() {
        let cloned = new WitnessCol(this.id, this.stage);
        console.log('CLONE_WITNESS:', this, cloned);
        return cloned;
    }
}
