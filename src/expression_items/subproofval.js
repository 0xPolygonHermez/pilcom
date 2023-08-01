const LabelRanges = require("../label_ranges.js");
const ProofItem = require("./proof_item.js");
module.exports = class Subproofval extends ProofItem {
    constructor (id) {
        super(id);
    }
    getId() {
        return this.id;
    }
}
