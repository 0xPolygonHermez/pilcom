const ProofItem = require("./proof_item.js");
module.exports = class Challenge extends ProofItem {
    constructor (id) {
        super(id);
    }
    clone() {
        return new Challenge(this.id);
    }
}
