const ProofItem = require("./proof_item.js");
module.exports = class Subproofval extends ProofItem {
    constructor (id) {
        super(id);
    }
    getTag() {
        return 'subproofvalue';
    }
    cloneInstance() {
        return new Subproofval(this.id);
    }
}
