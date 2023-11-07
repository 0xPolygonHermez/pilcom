const LabelRanges = require("../label_ranges.js");
const RuntimeItem = require("./runtime_item.js");
const MultiArray = require('../multi_array.js');
const {assert, assertLog} = require('../assert.js');
const Context = require('../context.js');
module.exports = class ArrayOf extends RuntimeItem {
    constructor (instanceType, array) {
        super();
        assertLog(array instanceof MultiArray, array);

        this.instanceType = instanceType;
        this._array = array.clone();
        console.log(array.constructor.name, array, this._array);
    }
    toString(options) {
        return super.toString(options)+'['+this._array.lengths.join('],[')+']';
    }
    get array() {
        return this._array;
    }
    set array(value) {
        throw new Error();
    }
    get instance() {
        return Context.references.getTypeInstance(this.instanceType);
    }
    cloneInstance() {
        console.log(this.instanceType, this._array);
        return new ArrayOf(this.instanceType, this._array);
    }
    evalInside() {
        return this.clone();
    }
    getItem(indexes) {
        const id = this._array.indexesToOffset(indexes);
        return this.instance.getItem(id);
    }
}
