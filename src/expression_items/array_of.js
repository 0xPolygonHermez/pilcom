const LabelRanges = require("../label_ranges.js");
const RuntimeItem = require("./runtime_item.js");
const MultiArray = require('../multi_array.js');
const {assert, assertLog} = require('../assert.js');
const Context = require('../context.js');
module.exports = class ArrayOf extends RuntimeItem {
    constructor (instanceType, array) {
        super();
        assert(array instanceof MultiArray);

        this.instanceType = instanceType;
        this.array = array.clone();
    }
    get instance() {
        return Context.references.getTypeInstance(this.instanceType);
    }
    cloneInstance() {
        return new ArrayOf(this.instanceType, this.array);
    }
    evalInside() {
        return this.clone();
    }
    getItem(indexes) {
        const id = this.array.indexesToOffset(indexes);
        return this.instance.getItem(id);
    }
}
