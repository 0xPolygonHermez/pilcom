const ProofItem = require("./proof_item.js");
module.exports = class PublicTable extends ProofItem {
    constructor (id) {
        super(id);
    }
    getId() {
        return this.id;
    }
    cloneInstance() {
        return new PublicTable(this.id);
    }
}
