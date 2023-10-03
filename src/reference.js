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
        this.initialized = false;
        for (const property in properties) {
            assert(typeof this[property] === 'undefined');
            if (property === 'const') console.log(['CONST ********', properties[property]]);
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
    markAsInitialized(indexes = []) {
        if (indexes.length === 0 || !this.array) {
            assert(this.initialized === false);
            this.initialized = true;
        }
        else {
            this.array.markAsInitialized(indexes);
        }
    }
    isInitialized(indexes = []) {
        return  (indexes.length === 0 || !this.array) ? this.initialized : this.array.isInitialized(indexes);
    }
    getId(indexes = []) {
        return  (indexes.length === 0 || !this.array) ? this.locator : this.array.getIndexesOffset(indexes);
    }
    set (value, indexes = []) {
        assert(value !== null); // to detect obsolete legacy uses
        if (!this.isInitialized(indexes)) {
            return this.#doInit(value, indexes);
        }
        const id = this.getId(indexes);
        if (this.const) {
            // TODO: more info
            throw new Error('setting a const element');
        }
        this.instance.set(id, value);
    }
    #doInit(value, indexes) {
        const id = this.getId(indexes);
        assert(id !== null);
        this.instance.set(id, value);
        this.markAsInitialized(indexes);
    }
    init (value, indexes = []) {
        assert(value !== null); // to detect obsolete legacy uses
        if (this.isInitialized(indexes)) {
            // TODO: more info
            throw new Error('value initialized');
        }
        this.#doInit(value, indexes);
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
        const res = options.const ? this.instance.getItem(locator, options) : this.instance.getConstItem(locator, options);
        console.log(['GETITEM', res.constructor.name, res.definition, this.const]);
        if (label) res.setLabel(label);
        else res.setLabel('___');

        console.log(res);
        return res;
    }
}

module.exports = Reference;