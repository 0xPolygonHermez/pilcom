const ProofItem = require("./proof_item.js");
const PublicItem = require('../expression_items/public.js');
module.exports = class Public extends ProofItem {
    constructor (id) {
        super(id);
    }
    get value () {
        return new PublicItem(this.id);
    }
    getId() {
        return this.id;
    }
    clone() {
        return new Public(this.id);
    }
}
