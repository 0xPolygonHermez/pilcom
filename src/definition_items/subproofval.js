const ProofItem = require("./proof_item.js");
module.exports = class Subproofval extends ProofItem {
    constructor (id, data = {}) {
        super(id);
        this.aggregateType = data.aggregateType;
        this.sourceRef = data.sourceRef;
        this.subproofId = data.subproofId;
        this.label = data.label;
    }
    clone() {
        return new Subproofval(this.id, {aggregateType: this.aggregateType,
                                         sourceRef: this.sourceRef,
                                         subproofId: this.subproofId,
                                         label: (this.label && typeof this.label.clone === 'function') ? this.label.clone : this.label});
    }
}
