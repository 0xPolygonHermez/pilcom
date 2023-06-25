const {assert} = require("chai");
const {MultiArray} = require("./multi_array.js");
const Expression = require("./expression.js");
module.exports = class References {

    constructor (Fr, context, scope) {
        this.Fr = Fr;
        this.definitions = {};
        this.types = {};
        this.context = context;
        this.scope = scope;
        this.visibilityScope = 0;
        this.visibilityStack = [];
        this.scope.setReferences(this);
    }
    pushVisibilityScope()
    {
        this.visibilityStack.push(this.visibilityScope);
        this.visibilityScope = this.scope.deep;
    }
    popVisibilityScope()
    {
        if (this.visibilityStack.length < 1) {
            throw new Error(`invalid popVisibilitScope`);
        }
        this.visibilityScope = this.visibilityStack.pop()
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
    isReferencedType(type) {
        return type.at(0) === '&'
    }
    getReferencedType(type) {
        return this.isReferencedType(type) ? type.substring(1):type;
    }

    _getRegisteredType (type) {
        const reference = this.isReferencedType(type);
        const finalType = this.getReferencedType(type);
        const tdata = this.types[finalType];
        if (typeof tdata === 'undefined') {
            throw new Error(`unknown type ${type} [${finalType}]`);
        }
        if (reference) {
            tdata.reference = true;
            tdata.referencedType = finalType;
        }
        return tdata;
    }

    declare (name, type, lengths = [], data = null) {
        console.log(`DECLARE_REFERENCE ${name} ${type} []${lengths.length} #${this.scope.deep}`, data);
        assert(typeof name === 'string');
        assert(!name.includes('::object'));
        assert(!name.includes('.object'));
        let size, array;
        if (lengths && lengths.length) {
            array = new MultiArray(lengths);
            size = array.size;
        } else {
            array = false;
            size = 1;
        }

        const def = this.definitions[name];
        const global = data && data.global;
        const scopeId = (this.hasScope(type) && !global) ? this.scope.declare(name, type, def ?? false) : 0;
        // scope(name, def) => exception !!!
        //                  => scopeId;
        if (typeof def !== 'undefined' && def.scopeId === scopeId) {
            console.log(def);
            throw new Error(`${name} was defined previously on ${def.data.sourceRef}`)
        }

        const reference = this.isReferencedType(type);

        const tdata = reference ? {} : this._getRegisteredType(type);
        const id = reference ? null : tdata.instance.reserve(size, name, array, data);
        this.definitions[name] = {
            type,
            array,
            reference,
            referencedType: reference ? type.substring(1) : false,       // to define valid referenced type
            locator: id,
            scope: scopeId,
            data
        }
        return id;
    }
    isDefined(name, indexes = []) {
        const names = this.context.getNames(name);
        let found = false;
        let def;
        for (const _name of names) {
            def = this.definitions[_name] ?? false;
            if (def) {
                found = _name;
                break;
            }
        }
        if (def.scope && def.type !== 'constant' && def.scope < this.visibilityScope) {
            return false;
        }

        if (found !== false) {
            if (Array.isArray(indexes) && indexes.length > 0) {
                return def.array ? def.array.isValidIndexes(indexes) : false;
            }
            return true;
        }

        return false;
    }
    hasScope(type) {
        // TODO: inside function ??
        // TODO: col reference
        // return ['im', 'witness', 'fixed', 'public', 'prover', 'challenge'].includes(type) === false;
        return ['public', 'prover', 'challenge','subair'].includes(type) === false;
    }

    get (name, indexes = []) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        return instance.get(info.locator + info.offset);
    }
    getIdRefValue(type, id) {
        const tdata = this._getRegisteredType(type);
        return tdata.instance.getTypedValue(id);
    }
    getLabel(type, id, options) {
        const instance = this.types[type].instance;
        return instance.getLabel(id, options);
    }
    getTypeR(name, indexes, options) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        return [instance.getType(info.locator + info.offset), info.reference];
    }
    getTypedValue (name, indexes, options) {
        indexes = indexes ?? [];
        options = options ?? {};

        if (typeof indexes === 'undefined') indexes = [];

        const [instance, info, def] = this._getInstanceAndLocator(name, indexes);
        let tvalue;
        if (info.array) {
            // array info, could not be resolved
            tvalue = {type: info.type ?? def.type, id: info.locator + info.offset };
        } else {
            // no array could be resolved
            tvalue = instance.getTypedValue(info.locator + info.offset, info.type);
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
            tvalue.value += options.preDelta;
            instance.set(info.locator + info.offset, tvalue.value);
        }
        if (options.postDelta) {
            instance.set(info.locator + info.offset, tvalue.value + options.postDelta);
        }
        return tvalue;
    }
    getTypeInfo (name, indexes = []) {
        return this._getInstanceAndLocator(name, indexes);
    }
    getDefinition(name) {
        // debugger;
        let names = this.context.getNames(name);
        let def;
        for (const name of names) {
            def = this.definitions[name];
            if (typeof def !== 'undefined') break;
        }
        if (typeof def === 'undefined') {
            throw new Error(`Reference ${names.join(',')} not found`);
        }

        // constants are visible inside functions
        if (def.scope && def.type !== 'constant' && def.scope < this.visibilityScope) {
            throw new Error(`Reference ${names.join(',')} not visible from current scope`);
        }
        return def;
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
    getReferenceType (name) {
        let dest = this.getDefinition(name);
        return dest.type ?? false;
    }
    setReference (name, value) {
        let dest = this.getDefinition(name);
        const _value = value instanceof Expression ? value.getAloneOperand() : value;
        // TODO: reference not knows operand types
        if (_value.type === 3) {
            assert(!_value.next);
            if (_value.op === 'reference') {
                assert(!_value.array);
                const src = this.getDefinition(_value.name);
                if (src.array) {
                    const __array = src.array.getIndexesTypedOffset(_value.__indexes);
                    dest.array = __array.array;
                    dest.locator = src.locator + __array.offset;

                } else {
                    dest.array = false;
                    dest.locator = src.locator;
                }
                dest.type = src.type;
                dest.scope = src.scope;
            } else if (_value.op === 'idref') {
                dest.locator = _value.id;
                dest.type = _value.refType;
                dest.scope = false;
                dest.array = _value.array;
            }
        } else {
            assert(_value.type == 1);
            assert(!_value.__next);
            dest.locator = _value.id;
            dest.type = _value.refType;
        }
    }
    set (name, indexes, value) {
        // console.log({name, indexes, value});
        // if (name === 'N_MAX') debugger;
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        return instance.set(info.locator + info.offset, value);
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
