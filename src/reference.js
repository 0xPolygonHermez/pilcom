const {assert, assertLog} = require('./assert.js');
const MultiArray = require("./multi_array.js");
const ArrayOf = require('./expression_items/array_of.js');

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
        console.log(`getId ${this.name} ${Array.isArray(indexes) ? '[' + indexes.join(',') + ']':indexes} ${this.array ? this.array.toDebugString():''}`);
        return  (indexes.length === 0 || !this.array) ? this.locator : this.array.getLocator(this.locator, indexes);
    }
    set (value, indexes = [], options = {}) {
        console.stdebug(`set(${this.name}, [${indexes.join(',')}]`);
        assert(value !== null); // to detect obsolete legacy uses
        if (!this.array || this.array.isFullIndexed(indexes)) {
            return this.setOneItem(value, indexes, options);
        }
        this.setArrayLevel(0, indexes, value, options);
        // At this point, it's a array initilization
    }
    setArrayLevel(level, indexes, value, options = {}) {
        console.log(`setArrayLevel(${this.name} ${level}, [${indexes.join(',')}]`);
        const len = this.array.lengths[level];
        for (let index = 0; index < len; ++index) {
            let _indexes = [...indexes];
            _indexes.push(index);
            if (level + 1 === this.array.dim) {
                this.setOneItem(value.getItem(_indexes), _indexes, options);
                continue;
            }
            this.setArrayLevel(level+1, _indexes, value, options);
        }
    }
    // setting by only one element
    setOneItem(value, indexes, options = {}) {
        if (!this.isInitialized(indexes)) {
            return this.#doInit(value, indexes);
        } else if (options.doInit) {
            // called as doInit:true but it's initizalized before
            throw new Error('value initialized');
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
    init (value, indexes = [], options = {}) {
        assert(value !== null); // to detect obsolete legacy uses
        this.set(value, indexes, {...options, doInit: true});
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
        let locator = this.locator;
        let label = options.label;

        // indexes evaluation
        let evaluatedIndexes = [];
        if (Array.isArray(indexes) && indexes.length > 0) {
            evaluatedIndexes = indexes.map(x => x.asInt());
            if (label) label = label + '['+evaluatedIndexes.join('],[')+']';
        }

        // if array is defined
        let res = false;
        if (this.array) {
            if (this.array.isFullIndexed(evaluatedIndexes)) {
                // full access => result an item (non subarray)
                locator = this.array.locatorIndexesApply(this.locator, evaluatedIndexes);
            } else {
                // parcial access => result a subarray
                res = new ArrayOf(this.type, this.array.createSubArray(evaluatedIndexes, locator));
            }
        } else if (evaluatedIndexes.length > 0) {
            throw new Error('try to access to index on non-array value');
        }
        if (res === false) {
            res = options.const ? this.instance.getConstItem(locator, options) : this.instance.getItem(locator, options);
        }

        if (label) res.setLabel(label);
        else res.setLabel('___');

        return res;
    }
}

module.exports = Reference;