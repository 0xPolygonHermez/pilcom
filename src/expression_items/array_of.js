const LabelRanges = require("../label_ranges.js");
const RuntimeItem = require("./runtime_item.js");

module.exports = class ArrayOf extends RuntimeItem {
    constructor (baseCls, id, type, instance) {
        super();
        this.baseCls = baseCls;
        this.id = id;
        this.rtype = type;
        this.instance = instance;
    }
    cloneInstance() {
        return new ArrayOf(this.baseCls, this.id, this.rtype, this. instance);
    }
}
