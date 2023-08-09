const {assert, assertLog} = require('./assert.js');
const {MultiArray} = require("./multi_array.js");
module.exports = class Reference {

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
        if (!this.array) return id;

        // TODO:



        const typedOffset = def.array.getIndexesTypedOffset(indexes);
        let res = {locator: def.locator, ...typedOffset};

        // if instance doesn't support offset, add offset inside locator
        // and set offset = false
        if (res.offset) {
            res.locator += res.offset;
        }
        res.offset = 0;
        // return [tdata.instance, res, def];
        const indexLengthLimit = tdata.instance.rows ? 1 : 0;
        if (indexes.length > indexLengthLimit) {
            throw new Error(`Invalid array or row access, too many array levels`);
        }
        let extraInfo = {type: def.type, offset: 0, reference: def.reference, referencedType: def.referencedType};
        if (indexes.length > 0) {
            extraInfo.row = indexes[0];
        }
        return [tdata.instance, {locator: def.locator, ...extraInfo}, def];
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
        this.instance.get(this.getId(indexes));
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        return instance.get(info.locator + info.offset);
    }
    getIdRefValue(type, id) {
        return this.getRegisteredType(type).instance.getItem(id);
    }
    getLabel(type, id, options) {
        return this.getRegisteredType(type).instance.getLabel(id, {type, ...options});
    }
    getTypeR(name, indexes, options) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        return [instance.getType(info.locator + info.offset), info.reference, info.array ?? false];
    }
    getItem(name, indexes, options) {
        indexes = indexes ?? [];
        options = options ?? {};

        const [instance, info, def] = this._getInstanceAndLocator(name, indexes);
        let tvalue;
        if (info.array) {
            // array info, could not be resolved
            console.log('***** ARRAY ******');
            tvalue = new ArrayOf(instance.cls, info.locator + info.offset, info.type ?? def.type, instance);
        } else {
            // no array could be resolved
            console.log([instance.constructor.name, info.type]);
            tvalue = instance.getTypedValue(info.locator + info.offset, 0, info.type);
        }
        // TODO: review
        if (info.type !== 'function') {
            assertLog(tvalue instanceof ExpressionItem, {name, infotype: info.type, tvalue});
        }
        if (typeof info.row !== 'undefined') {
            tvalue.row = info.row;
        }
        if (!info.array) {
            tvalue.id = info.locator;
        }
        if (options.full) {
            tvalue.locator = info.locator;
            tvalue.instance = instance;
            tvalue.offset = info.offset;
        }
        if (info.dim) {
            tvalue.dim = info.dim;
//            tvalue.arrayType = info.arrayType;
            tvalue.lengths = info.lengths;
        }
        if (info.array) {
            tvalue.dim = 'DEPRECATED';
            tvalue.lengths = 'DEPRECATED';
            tvalue.array = info.array;
        }
        if (options.preDelta) {
            console.log(typeof tvalue.value);
            assert(typeof tvalue.value === 'number' || typeof tvalue.value === 'bigint');
            tvalue.value += options.preDelta;
            instance.set(info.locator + info.offset, tvalue.value);
        }
        if (options.postDelta) {
            assert(typeof tvalue.value === 'number' || typeof tvalue.value === 'bigint');
            instance.set(info.locator + info.offset, tvalue.value + options.postDelta);
        }
        return tvalue;
    }
    _getTypedValue (name, indexes, options) {
        indexes = indexes ?? [];
        options = options ?? {};

        if (typeof indexes === 'undefined') indexes = [];

        const [instance, info, def] = this._getInstanceAndLocator(name, indexes);
        let tvalue;
        if (info.array) {
            // array info, could not be resolved
            console.log('***** ARRAY ******');
            tvalue = new ArrayOf(instance.cls, info.locator + info.offset, info.type ?? def.type, instance);
        } else {
            // no array could be resolved
            console.log([instance.constructor.name, info.type]);
            tvalue = instance.getTypedValue(info.locator + info.offset, 0, info.type);
        }
        // TODO: review
        if (info.type !== 'function') {
            assertLog(tvalue instanceof ExpressionItem, {name, infotype: info.type, tvalue});
        }
        if (typeof info.row !== 'undefined') {
            tvalue.row = info.row;
        }
        if (!info.array) {
            tvalue.id = info.locator;
        }
        if (options.full) {
            tvalue.locator = info.locator;
            tvalue.instance = instance;
            tvalue.offset = info.offset;
        }
        if (info.dim) {
            tvalue.dim = info.dim;
//            tvalue.arrayType = info.arrayType;
            tvalue.lengths = info.lengths;
        }
        if (info.array) {
            tvalue.dim = 'DEPRECATED';
            tvalue.lengths = 'DEPRECATED';
            tvalue.array = info.array;
        }
        if (options.preDelta) {
            console.log(typeof tvalue.value);
            assert(typeof tvalue.value === 'number' || typeof tvalue.value === 'bigint');
            tvalue.value += options.preDelta;
            instance.set(info.locator + info.offset, tvalue.value);
        }
        if (options.postDelta) {
            assert(typeof tvalue.value === 'number' || typeof tvalue.value === 'bigint');
            instance.set(info.locator + info.offset, tvalue.value + options.postDelta);
        }
        return tvalue;
    }
    getTypeInfo (name, indexes = []) {
        return this._getInstanceAndLocator(name, indexes);
    }
    addUse(name) {
        if (!this.containers[name]) {
            // TODO: defined must be check containers
            throw new Exception(`Use not created container ${name}`);
        }
        this.scope.addToScopeProperty('uses', name);
        this.uses.push(name);
    }
    searchDefinition(name) {
        const subnames = name.split('.');
        const container = subnames.length > 1 ? subnames.slice(0, -1).join('.') : false;
        const lname = subnames[subnames.length - 1];

        if (name === 'air.gw1') {
            console.log({subnames, container, lname});
        }
        let def = false;

        if (this.currentContainer !== false && !container) {
            def = this.containers[this.currentContainer].definitions[lname];
        }
        if (!def && container) {
            if (['proof', 'subproof', 'air'].includes(container)) {
                const scopeId = this.scope.getScopeId(container);
                if (name === 'air.gw1') {
                    console.log(scopeId);
                }
                if (scopeId === false) {
                    throw new Error(`not found scope ${container}`);
                }
                def = this.definitions[lname];
                if (name === 'air.gw1') {
                    console.log(def);
                }
                if (def && def.scopeId !== scopeId) {
                    throw new Error(`Not match declaration scope and accessing scope (${container}) of ${name}`);
                }
            }
            if (!def && this.containers[container]) {
                def = this.containers[container].definitions[lname];
            }
        }
        if (!def) {
            def = this.definitions[name];
        }
        let iuse = this.uses.length;
        while (!def && iuse > 0) {
            --iuse;
            def = this.containers[this.uses[iuse]].definitions[name];
        }
        return def;
    }
    setReference (name, value) {
        let dest = this.getReference(name);
        // TODO: reference not knows operand types
        if (value instanceof Expression) {
            value = value.getAloneOperand();
            if (value instanceof ReferenceItem) {
                assert(!value.next);
                assert(!value.array);
                const src = this.getReference(value.name);
                if (src.array) {
                    const __array = src.array.getIndexesTypedOffset(value.__indexes);
                    dest.array = __array.array;
                    dest.locator = src.locator + __array.offset;

                } else {
                    dest.array = false;
                    dest.locator = src.locator;
                }
                dest.type = src.type;
                dest.scope = src.scope;
                dest.scopeId = src.scopeId;
            } else if (value instanceof ProofItem) {
                dest.locator = value.id;
                dest.type = value.refType;
                dest.scope = false;
                dest.scopeId = false;
                dest.array = value.array;
            }
        } else if (value instanceof ProofItem) {
            assert(!value.__next);
            dest.locator = value.id;
            dest.type = value.refType;
        } else {
            throw new Error(`Invalid reference`);
        }
    }
    _getInstanceAndLocator (name, indexes) {
        const def = this.getDefinition(name);
        // TODO: partial access !!!
        // TODO: control array vs indexes
        const tdata = this._getRegisteredType(def.type);
        if (def.array !== false) {
            // TODO ROW ACCESS
            const typedOffset = def.array.getIndexesTypedOffset(indexes);
            let res = {locator: def.locator, ...typedOffset};

            // if instance doesn't support offset, add offset inside locator
            // and set offset = false
            if (res.offset) {
                res.locator += res.offset;
            }
            res.offset = 0;
            return [tdata.instance, res, def];
        }
        const indexLengthLimit = tdata.instance.rows ? 1 : 0;
        if (indexes.length > indexLengthLimit) {
            throw new Error(`Invalid array or row access, too many array levels`);
        }
        let extraInfo = {type: def.type, offset: 0, reference: def.reference, referencedType: def.referencedType};
        if (indexes.length > 0) {
            extraInfo.row = indexes[0];
        }
        return [tdata.instance, {locator: def.locator, ...extraInfo}, def];
    }
}
