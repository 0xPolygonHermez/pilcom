const {assert, assertLog} = require('./assert.js');
const {MultiArray} = require("./multi_array.js");

/**
 * @property {MultiArray} array
 */

class Reference {

    constructor (name, type, isReference, array, id, instance, scopeId, properties) {
        this.name = name;
        this.type = type;
        assert(typeof isReference === 'boolean');
        this.isReference = isReference;
        this.array = array;
        this.locator = id;
        this.scopeId = scopeId;
        this.instance = instance;
        for (const property in properties) {
            assert(typeof this[property] === 'undefined');
            this[property] = properties[property];
        }
    }
    isValidIndexes(indexes = []) {
        // if (!Array.isArray(indexes) || indexes.length == 0) return true;
        if (!Array.isArray(indexes)) return false;
        if (indexes.length == 0) return true;
        if (!this.array) return false;
        return this.array.isValidIndexes(indexes);
    }

    getId(indexes = []) {
        return  (indexes.length === 0 || !this.array) ? this.locator : this.array.getIndexesOffset(indexes);
    }
    init (value, indexes = []) {
        return this.set(value, indexes);
    }
    set (value, indexes = []) {
        assert(value !== null); // to detect obsolete legacy uses
        const id = this.getId(indexes);
        this.instance.set(id, value);
    }
    static getArrayAndSize(lengths) {
        // TODO: dynamic arrays, call to factory, who decides?
        if (lengths && lengths.length) {
            let array = new MultiArray(lengths);
            return [array, array.size];
        }
        return [false, 1];
    }
    get (indexes = []) {
        return this.instance.get(this.getId(indexes));
    }
    getItem(indexes, options = {}) {
        console.log(indexes);
        let locator = this.locator;
        if (Array.isArray(indexes) && indexes.length > 0) {
            const evaluatedIndexes = indexes.map(x => x.asInt());
            locator = this.array.locatorIndexesApply(this.locator, evaluatedIndexes);
        }
        const res = this.instance.getItem(this.locator);
        console.log(res);
        return res;
    }
}

module.exports = Reference;