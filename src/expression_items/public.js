const ProofItem = require("./proof_item.js");
module.exports = class Public extends ProofItem {
    constructor (id) {
        super(id);
    }
    getId() {
        return this.id;
    }
    getTag() {
        return 'public';
    }
    cloneInstance() {
        return new Public(this.id);
    }
}
