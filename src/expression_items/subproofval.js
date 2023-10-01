const ProofItem = require("./proof_item.js");
module.exports = class Subproofval extends ProofItem {
    constructor (id, stage) {
        super(id, stage);
    }
    cloneInstance() {
        return new Subproofval(this.id, this.stage);
    }
}
