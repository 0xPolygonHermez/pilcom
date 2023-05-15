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
        const scopeId = this.scope.declare(name, def ?? false);
        // scope(name, def) => exception !!!
        //                  => scopeId;
        if (typeof def !== 'undefined') {
            console.log(def);
            throw new Error(`${name} was defined previously on ${def.data.sourceRef}`)
        }

        this.definitions[name] = {
            type,
            array,
            locator: tdata.instance.reserve(size, data),
            scope: scopeId,
            data
        }
    }

    get (name, indexes = []) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        console.log(`GET ${instance.constructor.name}.get(${info.locator}, ${info.offset})`);
        return instance.get(info.locator, info.offset);
    }

    getTypedValue (name, indexes = []) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        console.log([instance.constructor.name, info])
        let tvalue = instance.getTypedValue(info.locator, info.offset);
        console.log('TYPEDVALUE');
        console.log(tvalue)
        if (info.dim) {
            tvalue.dim = info.dim;
//            tvalue.arrayType = info.arrayType;
            tvalue.lengths = info.lengths;
        }
        console.log({DEBUG:'getTypedValue', ...tvalue});
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

        const typedOffset = (def.array === false) ? {offset: 0} : def.array.getIndexesTypedOffset(indexes);
        console.log(['T-offset', typedOffset, indexes, def.array === false]);
        return [tdata.instance, {locator: def.locator, ...typedOffset}];
    }

    set (name, indexes, value) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        console.log(`#### ${name} ${value} ${instance.constructor.name}`);
        return instance.set(info.locator, info.offset, value);
    }

    unset(name) {
        let def = this.definitions[name];
        if (def.array) delete def.array;
        delete this.definitions[name];
    }

/*    *[Symbol.iterator]() {
        for (let index in this.definitions) {
          yield index;
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
    }*/
    dump () {
        for (let name in this.definitions) {
            const def = this.definitions[index];
            const indexes = def.array === false ? '': def.multiarray.getLengths().join(',');
            console.log(`${name.padEnd(30)}|${def.type.padEnd(10)}|${indexes}`);
        }
    }
}
