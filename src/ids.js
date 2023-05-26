const LabelRanges = require("./label_ranges.js");
module.exports = class Ids {

    constructor (type) {
        this.lastId = 0;
        this.type = type;
        this.labelRanges = new LabelRanges();
    }

    reserve(count = 1, label, multiarray) {
        const id = this.lastId;
        this.lastId += count;
        if (label) {
            this.labelRanges.define(label, id, multiarray);
        }
        return id;
    }
    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
    }
    get(id, offset) {
        return this.getTypedValue(id, offset)
    }

    getTypedValue(id, offset) {
        return { type: this.type, value: id + offset };
    }

    isDefined(id) {
        return (id < this.lastId)
    }

    getLastId() {
        return this.lastId
    }
    dump() {
        console.log('DUMP');
        for (const id of this.values) {
            console.log([id, this.values[id]]);
        }
    }
}
