const ProofItem = require("./proof_item.js");

module.exports = class Proofval extends ProofItem {
    constructor (id) {
        super(id);
    }
    getId() {
        return this.id;
    }
    clone() {
        return new Proofval(this.id);
    }
}
