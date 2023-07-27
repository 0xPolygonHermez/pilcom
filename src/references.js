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
        this.containers = {};
        this.currentContainer = false;
        this.scope.setReferences(this);
        this.aliases = {};
        this.uses = [];
    }
    addScopeAlias(alias, value) {
        // NOTE: there is no need to check for aliases because by grammatical definition,
        // aliases must be an identifier

        if (this.aliases[alias]) {
            throw new Error(`Alias ${alias} already defined on ${this.aliases[alias].sourceRef}`);
        }

        this.scope.addToScopeProperty('aliases', alias);
        this.aliases[alias] = {container: value, sourceRef: this.context.sourceRef};
    }
    getAlias(alias, defaultValue) {
        return this.aliases[alias] ?? defaultValue;
    }
    unsetAlias(aliases) {
        for (const alias of aliases) {
            assert(this.aliases[alias]);
            delete this.aliases[alias];
        }
    }
    unsetUses(uses) {
        let count = uses.length;
        while (count > 0) {
            const use1 = this.uses.pop();
            const use2 = uses.pop();
            assert(use1 === use2);
            --count;
        }
    }
    unsetProperty(property, values) {
        switch (property) {
            case 'aliases': return this.unsetAlias(values);
            case 'uses': return this.unsetUses(values);
        }
        throw new Error(`unsetProperty was called with invalid property ${property}`);
    }
    createContainer(name, alias = false)
    {
        if (this.currentContainer !== false) {
            throw new Error(`Container ${this.currentContainer} is open, must be closed before start new container`);
        }

        // console.log(`createContainer(${name},${alias}) at ${this.context.sourceRef}`);
        // if container is defined, contents is ignored but alias must be defined
        if (alias) {
            this.addScopeAlias(alias, name);
        }

        console.log(`CREATE CONTAINER ${name}`);
        // if container is defined, contents is ignored
        if (this.containers[name]) {
            return false;
        }

        const nameInfo = this.decodeName(name);
        this.containers[name] = {scope: nameInfo.scope, alias, definitions: {}};
        this.currentContainer = name;
        return true;
    }
    closeContainer()
    {
        this.currentContainer = false;
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
    clearType(type) {
        const typeInfo = this.types[type];
        if (typeof typeInfo === 'undefined') {
            throw new Error(`type ${type} not registered`);
        }
        typeInfo.instance.clear();
        // TODO: remove references
        for (const name in this.definitions) {
            if (this.definitions[name].type !== type) continue;
            delete this.definitions[name];
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
    decodeName (name) {
        const parts = name.split('.');
        let scope = false;
        if (parts.length === 1) {
            return {scope, name, parts};
        }
        const isProofScope = parts[0] === 'proof';
        const isSubproofScope = parts[0] === 'subproof';
        const isAirScope = parts[0] === 'air';
        const absoluteScope = isProofScope || isSubproofScope || isAirScope;
        let res = {isProofScope, isSubproofScope, isAirScope, absoluteScope, parts};
        if (absoluteScope) {
            if (parts.length > 2) {
                return {...res, scope: parts[0], name: parts.slice(-1), container: parts.slice(0, -1).join('.')};
            }
            return {...res, scope: parts[0], static: true, name: parts.slice(1).join('.')};
        }
        return {...res, scope, name};
    }
    getArrayAndSize(lengths) {
        if (lengths && lengths.length) {
            let array = new MultiArray(lengths);
            return [array, array.size];
        }
        return [false, 1];
    }
    declare (name, type, lengths = [], data = null, initValue = null) {
        assert(typeof name === 'string');
        assert(!name.includes('::object'));
        assert(!name.includes('.object'));

        const nameInfo = this.decodeName(name);
        console.log(`DECLARE_REFERENCE ${name} ==> ${nameInfo.name} ${type} []${lengths.length} scope:${nameInfo.scope} #${this.scope.deep}`, data);

        let [array, size] = this.getArrayAndSize(lengths);

        const def = this.definitions[nameInfo.name];
        let scopeId;
        let scope = false;

        if (this.currentContainer !== false) {
            if (nameInfo.scope !== false) {
                throw new Error(`Static reference ${name} inside container not allowed`);
            }
        } else if (nameInfo.static) {
            // only created and init once
            if (def) {
                if (!def.static) {
                    throw new Error(`Static reference ${name} has been defined on non-static scope`);
                }
                // nothing to do (important: static scope)
                return def.locator;
            }
            scope = nameInfo.scope;
            scopeId = this.scope.declare(nameInfo.name, type, false, scope);
        } else {
            scopeId = this.hasScope(type) ? this.scope.declare(nameInfo.name, type, def ?? false, scope) : 0;

            // scope(name, def) => exception !!!
            //                  => scopeId;
            if (typeof def !== 'undefined' && def.scopeId === scopeId) {
                throw new Error(`${name} was defined previously on ${def.data.sourceRef}`)
            }
        }
        // When reference is reference to other reference, caller put & before type name (ex: &int)
        const reference = this.isReferencedType(type);

        const tdata = reference ? {} : this._getRegisteredType(type);
        const id = reference ? null : tdata.instance.reserve(size, nameInfo.name, array, data);
        const cdef = {
            type,
            array,
            reference,
            referencedType: reference ? type.substring(1) : false,       // to define valid referenced type
            locator: id,
            scopeId,
            scope,
            container: this.currentContainer,
            static: nameInfo.static ?? false,
            data
        }
        if (this.currentContainer === false) {
            this.definitions[nameInfo.name] = cdef;
        } else {
            console.log(name);
            console.log(`ADD TO CONTAINER ${this.currentContainer} ${nameInfo.name}`);
            if (name === 'Byte4.gsum_result') EXIT_HERE;
            this.containers[this.currentContainer].definitions[nameInfo.name] = cdef;
        }

        if (initValue !== null) {
            this.set(nameInfo.name, [], initValue);
        }
        return id;
    }
    isDefined(name, indexes = []) {
        let def = this.getDefinition(name, false);
        let found = Boolean(def);
        /*
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

        console.log(def);
        console.log(this.visibilityScope);
        if (def.scopeId && def.type !== 'constant' && def.scopeId < this.visibilityScope) {
            return false;
        }
*/
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
        return ['public', 'proofvalue', 'challenge', 'subproofvalue'].includes(type) === false;
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
        return [instance.getType(info.locator + info.offset), info.reference, info.array ?? false];
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
            tvalue = instance.getTypedValue(info.locator + info.offset, 0, info.type);
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
    isVisible(def) {
        return !def.scopeId || def.type === 'constant' || def.scopeId >= this.visibilityScope; // || def.scopeId <= this.scope.getScopeId('air');
    }
    getDefinition(name, defaultValue) {
        // debugger;
        const nameInfo = this.decodeName(Array.isArray(name) ? name[0]:name);
        let names;
        if (nameInfo.scope !== false) {
            names = [Array.isArray(name) ? name[0]:name];
        } else if (!nameInfo.absoluteScope && nameInfo.parts.length == 2) {
            // console.log(['getScopeAlias',nameInfo.parts[0]]);
            const container = this.getAlias(nameInfo.parts[0], {container: false}).container;
            if (container) {
                names = [container + '.' + nameInfo.parts.slice(1).join('.')];
            }
        }
        if (!names) {
            names = this.context.getNames(name);
        }
        // console.log(`getDefinition(${name}) on ${this.context.sourceRef} = [${names.join(', ')}]`);
        let def;

        for (const name of names) {
            def = this.searchDefinition(name);
            if (typeof def !== 'undefined') break;
        }
        if (typeof def === 'undefined') {
            if (typeof defaultValue !== 'undefined') return defaultValue;
            throw new Error(`Reference ${names.join(',')} not found`);
        }

        // constants are visible inside functions
        if (this.isVisible(def) === false) {
            if (typeof defaultValue !== 'undefined') return defaultValue;
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
                dest.scopeId = src.scopeId;
            } else if (_value.op === 'idref') {
                dest.locator = _value.id;
                dest.type = _value.refType;
                dest.scope = false;
                dest.scopeId = false;
                dest.array = _value.array;
            }
        } else {
            assert(_value.type == 1);
            assert(!_value.__next);
            dest.locator = _value.id;
            dest.type = _value.refType;
        }
    }
    restore (name, cdef) {
        this.definitions[name] = cdef;
    }
    set (name, indexes, value) {
        // console.log({name, indexes, value});
        // if (name === 'N_MAX') debugger;
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        return instance.set(info.locator + info.offset, value);
    }

    unset(name) {
        console.log(`UNSET ${name}`);
        if (name === 'BYTE4_ID') {
            EXIT_HERE;
        }
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
