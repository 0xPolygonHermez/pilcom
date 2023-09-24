const ProofItem = require("./proof_item.js");
const {assert, assertLog} = require('../assert.js');
module.exports = class WitnessCol extends ProofItem {
    constructor (id) {
        assertLog(typeof id !== 'undefined', id);
        super(id);
        console.log('CONSTRUCTOR_WITNESS', id, this.id);
    }
    clone() {
        let cloned = new WitnessCol(this.id);
        console.log('CLONE_WITNESS:', this, cloned);
        return cloned;
    }
    toString() {
        return `WitnessCol@${this.id}`;
    }
}
