const Multiarray = require("./multiarray.js");

module.exports = class LabelRanges {

    constructor () {
        this.ranges = [];
    }
    define(label, from, multiarray) {
        this.ranges.push({label, from, multiarray, to: from + (multiarray ? multiarray.getSize() - 1 : 0)});
    }
    getLabel(id, options) {
        const range = this.ranges.find(e => id >= e.from && id <= e.to);
        if (!range) {
            console.log(this.ranges);
            return `@${id}[${offset}]`;
        }
        let res = range.label;
        options = options ?? {};
        if (options.hideClass) {
            res = res.replace(/.*::/,'');
        }
        if (range.to !== range.from) {
            let offset = id - range.from;
            res = res +'['+range.multiarray.offsetToIndexes(offset).join('],[')+']';
        }
        return res;
    }
}
