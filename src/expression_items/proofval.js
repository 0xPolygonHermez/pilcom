const ProofItem = require("./proof_item.js");

module.exports = class Proofval extends ProofItem {
    constructor (id) {
        super(id);
    }
    cloneItem() {
        return new Proofval(this.id);
    }
}
