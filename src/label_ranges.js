const MultiArray = require("./multi_array.js");

module.exports = class LabelRanges {

    constructor () {
        this.ranges = [];
    }
    define(label, from, multiarray) {
        // console.log(`LABEL.define ${label}`);
        this.ranges.push({label, from, multiarray, to: from + (multiarray ? multiarray.getSize() - 1 : 0)});
    }
    getLabel(id, options) {
        const range = this.ranges.find(e => id >= e.from && id <= e.to);
        if (!range) {
            return `@[${id}]`;
        }
        let res = range.label;
        options = options ?? {};
        if (options.hideClass) {
            res = res.replace(/.*::/,'');
        }
        if (range.to !== range.from) {
            let offset = id - range.from;
            res = res +'['+range.multiarray.offsetToIndexes(offset).join('][')+']';
        }
        return res;
    }
}
