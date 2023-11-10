const ProofItem = require("./proof_item.js");
const {assert, assertLog} = require('../assert.js');
module.exports = class Subproofval extends ProofItem {
    constructor (id, data = {}) {
        super(id);
        const subproofId = data.subproofId ?? false;
        assert(typeof data.subproofId === 'number');
        this.subproofId = subproofId;
        this.aggregateType = data.aggregateType;
        this.sourceRef = data.sourceRef;
        this.subproofId = data.subproofId;
        this.label = data.label;
        this.relativeId = data.relativeId ?? false;
    }
    clone() {
        return new Subproofval(this.id, {aggregateType: this.aggregateType,
                                         sourceRef: this.sourceRef,
                                         subproofId: this.subproofId,
                                         label: (this.label && typeof this.label.clone === 'function') ? this.label.clone : this.label});
    }
}
