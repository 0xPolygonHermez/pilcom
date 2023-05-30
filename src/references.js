const Multiarray = require("./multiarray.js");

module.exports = class References {

    constructor (Fr, scope) {
        this.Fr = Fr;
        this.definitions = {};
        this.types = {};
        this.scope = scope;
        this.scope.setReferences(this);
    }

    register(type, instance, options) {
        if (typeof this.types[type] !== 'undefined') {
            throw new Error(`type ${type} already registered`);
        }
        this.types[type] = {
            options: options || {},
            instance
        }
    }

    _getRegisteredType (type) {
        const tdata = this.types[type];
        if (typeof tdata === 'undefined') {
            throw new Error(`unknown type ${type}`);
        }
        return tdata;
    }

    declare (name, type, lengths = [], data = null) {
        console.log(`DECLARE_REFERENCE ${name} ${type} []${lengths.length} #${this.scope.deep}`);
        const tdata = this._getRegisteredType(type);
        let size, array;
        if (lengths && lengths.length) {
            array = new Multiarray(lengths);
            size = array.size;
        } else {
            array = false;
            size = 1;
        }

        const def = this.definitions[name];
        const scopeId = this.hasScope(type) ? this.scope.declare(name, def ?? false) : 0;
        // scope(name, def) => exception !!!
        //                  => scopeId;
        if (typeof def !== 'undefined') {
            console.log(def);
            throw new Error(`${name} was defined previously on ${def.data.sourceRef}`)
        }

        const id = tdata.instance.reserve(size, name, array, data);
        this.definitions[name] = {
            type,
            array,
            locator: id,
            scope: scopeId,
            data
        }
        return id;
    }
    hasScope(type) {
        // TODO: inside function ??
        // TODO: col reference
        return ['im', 'witness', 'fixed', 'public', 'prover', 'challenge'].includes(type) === false;
    }

    get (name, indexes = []) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        // console.log(`GET ${instance.constructor.name}.get(${info.locator}, ${info.offset})`);
        return instance.get(info.locator, info.offset);
    }
    getLabel(type, id, options) {
        const instance = this.types[type].instance;
        return instance.getLabel(id, options);
    }
    getTypedValue (name, indexes, options) {
        indexes = indexes ?? [];
        options = options ?? {};

        if (typeof indexes === 'undefined') indexes = [];

        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        let tvalue = instance.getTypedValue(info.locator, info.offset, info.type);
        if (typeof info.row !== 'undefined') {
            tvalue.row = info.row;
        }

        tvalue.id = info.locator;
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
        if (options.preDelta) {
            tvalue.value += options.preDelta;
            instance.set(info.locator, info.offset, tvalue.value);
        }
        if (options.postDelta) {
            instance.set(info.locator, info.offset, tvalue.value + options.postDelta);
        }
        return tvalue;
    }
    getTypeInfo (name, indexes = []) {
        return this._getInstanceAndLocator(name, indexes);
    }

    _getInstanceAndLocator (name, indexes) {
        let names = Array.isArray(name) ? name : [name];
        let def;
        for (const name of names) {
            def = this.definitions[name];
            if (typeof def !== 'undefined') break;
        }
        if (typeof def === 'undefined') {
            throw new Error(`Reference ${names.join(',')} not found`);
        }

        // TODO: partial access !!!
        // TODO: control array vs indexes
        const tdata = this._getRegisteredType(def.type);

        if (def.array !== false) {
            // TODO ROW ACCESS
            const typedOffset = def.array.getIndexesTypedOffset(indexes);
            let res = {locator: def.locator, ...typedOffset};

            // if instance doesn't support offset, add offset inside locator
            // and set offset = false
            if (!tdata.options.offsets) {
                if (res.offset) {
                    res.locator += res.offset;
                }
                res.offset = false;
            }
            return [tdata.instance, res];
        }
        const indexLengthLimit = tdata.instance.rows ? 1 : 0;
        if (indexes.length > indexLengthLimit) {
            throw new Error(`Invalid array or row access, too many array levels`);
        }
        let extraInfo = {type: def.type, offset: tdata.options.offsets ? 0:false};
        if (indexes.length > 0) {
            extraInfo.row = indexes[0];
        }
        return [tdata.instance, {locator: def.locator, ...extraInfo}];
    }

    set (name, indexes, value) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        if (info.offset === false) {
            return instance.set(info.locator, value);
        } else {
            return instance.set(info.locator, info.offset, value);
        }
    }

    unset(name) {
        let def = this.definitions[name];
        if (def.array) delete def.array;
        delete this.definitions[name];
    }

    *[Symbol.iterator]() {
        for (let index in this.definitions) {
          yield index;
        }
    }

    *keyValuesOfTypes(types) {
        for (let index in this.definitions) {
            const def = this.definitions[index];
            // console.log({index, ...def});
            if (!types.includes(def.type)) continue;
            yield [index, def];
        }
    }

    *values() {
        for (let index in this.definitions) {
            yield this.definitions[index];
        }
    }

    *keyValues() {
        for (let index in this.definitions) {
            yield [index, this.definitions[index]];
        }
    }
    dump () {
        for (let name in this.definitions) {
            const def = this.definitions[index];
            const indexes = def.array === false ? '': def.multiarray.getLengths().join(',');
            // console.log(`${name.padEnd(30)}|${def.type.padEnd(10)}|${indexes}`);
        }
    }
}
