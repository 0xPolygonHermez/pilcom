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
        assert(id !== null);
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
        console.log(['GETITEM', indexes, options]);
        let locator = this.locator;
        let label = options.label;
        if (Array.isArray(indexes) && indexes.length > 0) {
            const evaluatedIndexes = indexes.map(x => x.asInt());
            if (label) label = label + '['+evaluatedIndexes.join('],[')+']';
            locator = this.array.locatorIndexesApply(this.locator, evaluatedIndexes);
        }
        console.log(locator);
        const res = this.instance.getItem(locator);
        if (locator == 0 && res.constructor.name == 'WitnessCol' && !label) {
            EXIT_HERE;
        }
        if (label) res.setLabel(label);
        else res.setLabel('___');

        console.log(res);
        return res;
    }
}

module.exports = Reference;