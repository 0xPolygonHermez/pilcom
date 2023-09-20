const ProofItem = require("./proof_item.js");
const {assert, assertLog} = require('../assert.js');
module.exports = class WitnessCol extends ProofItem {
    constructor (id, stage = 1) {
        assertLog(typeof id !== 'undefined', id);
        super(id, stage);
        console.log('CONSTRUCTOR_WITNESS', id, this.id);
    }
    clone() {
        let cloned = new WitnessCol(this.id, this.stage);
        console.log('CLONE_WITNESS:', this, cloned);
        return cloned;
    }
}