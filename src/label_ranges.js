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
            const type = options.type ?? '';
            return `${type}@${id}`;
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
    clone() {
        let cloned = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        cloned.ranges = [];
        for (const range of this.ranges) {
            let duprange = {...range, multiarray: range.multiarray ? range.multiarray.clone() : range.multiarray};
            cloned.ranges.push(duprange);
        }
        return cloned;
    }
}
