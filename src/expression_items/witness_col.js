const ProofItem = require("./proof_item.js");
const {assert, assertLog} = require('../assert.js');
const Context = require('../context.js');
const Debug = require('../debug.js');
module.exports = class WitnessCol extends ProofItem {
    constructor (id) {
        assertLog(typeof id !== 'undefined', id);
        super(id);
        if (Debug.active) console.log('CONSTRUCTOR_WITNESS', id, this.id);
    }
    getTag() {
        return 'witness';
    }
    cloneInstance() {
        return new WitnessCol(this.id);
    }
}
