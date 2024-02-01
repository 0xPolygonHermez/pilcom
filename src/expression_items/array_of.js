const LabelRanges = require("../label_ranges.js");
const RuntimeItem = require("./runtime_item.js");
const MultiArray = require('../multi_array.js');
const {assert, assertLog} = require('../assert.js');
const Context = require('../context.js');
const Types = require('../types.js');
module.exports = class ArrayOf extends RuntimeItem {
    constructor (instanceType, array, unrollLevels = 0) {
        super();
        assertLog(array instanceof MultiArray, array);
        this._array = array.clone();
        this.unrollLevels = unrollLevels;
//        console.log(`ARRAYOF(${instanceType})[${array.lengths.map(x => x.toString(10)).join('],[')}] D${this.dim}`);

        this.instanceType = instanceType;
    }
    toString(options) {
        return super.toString(options)+'['+this._array.lengths.join('],[')+`] D${this.dim}`;
    }
    get dim() {
        return this._array.dim;
    }
    get array() {
        assert(this._array !== false, 'try to access to array, but array lengths not defined');
        return this._array;
    }
    set array(value) {
        if (this._array !== false) {
            throw new Error();
        }
        this._array = value;
    }
    get instance() {
        return Context.references.getTypeInstance(this.instanceType);
    }
    cloneInstance() {
        return new ArrayOf(this.instanceType, this._array, this.unrollLevels);
    }
    evalInside() {
        return this.clone();
    }
    getItem(indexes) {
        const offset = this._array.indexesToOffset(indexes);
        return this.instance.getItem(offset);
    }
    toArrays(indexes = []) {        
        let level = indexes.length;
        if (level >= this._array.dim) {
            return this.getItem(indexes);
        }
        let nextLevelLen = this._array.lengths[level];
        let res = [];
        for (let nextLevelIndex = 0; nextLevelIndex < nextLevelLen; ++nextLevelIndex) {
            const _indexes = [...indexes, nextLevelIndex];
            res.push(this.toArrays(_indexes));
        }
        return res;
    }
    static getType() {
        return this.instanceType;
    }
    operatorSpread() {
        return new ArrayOf(this.instanceType, this._array, this.unrollLevels + 1);
    }
    isUnrolled() {
        return this.unrollLevels > 0;
    }
    unroll() {
        assert(this.unrollLevels === 1);

        if (this._array.dim > 1) {
            // TODO: implement array of arrays of
            EXIT_HERE;
        }
        let len = this._array.lengths[0];
        let res = [];
        for (let index = 0; index < len; ++index) {
            res.push(this.getItem([index]));
        }
        return res;
    }
}
