const LabelRanges = require("../label_ranges.js");
const PilItem = require("../pil_item.js")
module.exports = class Public extends PilItem {
    constructor (id) {
        super(id);
    }
    getId() {
        return this.id;
    }
}