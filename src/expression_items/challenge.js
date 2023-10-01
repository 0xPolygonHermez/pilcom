const ProofItem = require("./proof_item.js");
module.exports = class Challenge extends ProofItem {
    constructor (id) {
        super(id);
    }
    cloneInstance() {
        return new Challenge(this.id);
    }
}
