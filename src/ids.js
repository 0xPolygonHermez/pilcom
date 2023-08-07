const LabelRanges = require('./label_ranges.js');
const ExpressionItem = require('./expression_items/expression_item.js');
const {assert,assertLog} = require('./assert.js');
module.exports = class Ids {

    constructor (type, cls) {
        this.lastId = 0;
        this.type = type;
        this.cls = cls;
        assertLog(cls.prototype instanceof ExpressionItem, cls);
        this.labelRanges = new LabelRanges();
    }

    reserve(count = 1, label, multiarray) {
        // console.log(`RESERVE ${this.type} ${this.lastId}-${this.lastId+count-1} LABEL:${label}`);
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

    getTypedValue(id, offset = 0) {
        return new this.cls(id + offset);
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
