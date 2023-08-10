const {assert, assertLog} = require('./assert.js');
const {MultiArray} = require("./multi_array.js");
const Expression = require("./expression.js");
const {ExpressionItem, ArrayOf} = require("./expression_items.js");
const Reference = require('./reference.js');
const Containers = require('./containers.js');
module.exports = class References {

    constructor (Fr, context, scope) {
        this.Fr = Fr;
        this.references = {};
        this.types = {};
        this.context = context;
        this.scope = scope;
        this.visibilityScope = 0;
        this.visibilityStack = [];
        this.containers = new Containers(this, context, scope);
        this.scope.setReferences(this);
        this.context.references = this;
    }
    getNameScope(name) {
        const nameInfo = this.decodeName(name);
        return nameInfo.scope;
    }
    createContainer(name, alias = false) {
        return this.containers.create(name, alias);
    }
    closeContainer() {
        this.containers.close();
    }
    pushVisibilityScope() {
        this.visibilityStack.push(this.visibilityScope);
        this.visibilityScope = this.scope.deep;
    }
    popVisibilityScope() {
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
        for (const name in this.references) {
            if (this.references[name].type !== type) continue;
            delete this.references[name];
        }
    }
    isReferencedType(type) {
        return type.at(0) === '&'
    }
    getReferencedType(type) {
        return this.isReferencedType(type) ? type.substring(1):type;
    }
    getTypeDefinition(type) {
        const typedef = this.types[type] ?? null;
        if (typedef === null) {
            throw new Error(`Invalid or unregistered type ${type}`);
        }
        return typedef;
    }
    getTypeInstance(type) {
        const typedef = this.types[type] ?? null;
        if (typedef === null) {
            throw new Error(`Invalid or unregistered type ${type}`);
        }
        return typedef.instance;
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
            // if absolute scope (proof, subproof or air) and has more than 2 parts, means at least 3 parts,
            // the middle part was container.
            if (parts.length > 2) {
                return {...res, scope: parts[0], name: parts.slice(-1), container: parts.slice(0, -1).join('.')};
            }
            // if absolute, but only 2 or less parts, no container specified.
            return {...res, scope: parts[0], isStatic: true, name: parts.slice(1).join('.')};
        }
        // if no absolute scope, could be an alias if it has 2 parts.
        return {...res, scope, name};
    }
    normalizeType(type) {
        if (this.isReferencedType(type)) {
            return [true, this.getReferencedType(type)];
        }
        return [false, type];
    }
    checkAndGetContainer(nameInfo) {
        const container = this.containers.getCurrent();
        if (container && nameInfo.scope !== false) {
            throw new Error(`Static reference ${nameInfo.name} inside container not allowed`);
        }
        // containers are scope-free.
        return container;
    }
    isStaticDeclaredPreviously(nameInfo, existingReference) {
        if (!nameInfo.isStatic) return false;
            // only created and init once
        if (existingReference) {
            if (existingReference.isStatic) {
                return true;
            }
            throw new Error(`Static reference ${nameInfo.name} has been defined on non-static scope`);
        }
        return false;
    }
    prepareScope(nameInfo, type, existingReference) {

        if (nameInfo.isStatic) {
            return [this.scope.declare(nameInfo.name, type, false, nameInfo.scope), nameInfo.scope];
        }

        const scopeId = this.hasScope(type) ? this.scope.declare(nameInfo.name, type, existingReference, false) : 0;
        // scope(name, def) => exception !!!
        //                  => scopeId;
        if (existingReference !== false && existingReference.scopeId === scopeId) {
            throw new Error(`${nameInfo.name} was defined previously on ${existingReference.data.sourceRef}`)
        }
        return [scopeId, false];
    }
    declare (name, type, lengths = [], data = null, initValue = null) {

        assert(typeof name === 'string');
        assert(!name.includes('::object'));
        assert(!name.includes('.object'));

        const nameInfo = this.decodeName(name);
        console.log(`DECLARE_REFERENCE ${name} ==> ${nameInfo.name} ${type} []${lengths.length} scope:${nameInfo.scope} #${this.scope.deep} ${initValue}`, data);

        let [array, size] = Reference.getArrayAndSize(lengths);

        const existingReference = this.references[nameInfo.name] ?? false;

        // When reference is reference to other reference, caller put & before type name (ex: &int)

        const [isReference, finalType] = this.normalizeType(type);

        let scopeId = 0;
        let scope = false;

        const container = this.checkAndGetContainer(nameInfo);
        if (!container) {
            if (this.isStaticDeclaredPreviously(nameInfo, existingReference)) {
                return existingReference.getId();
            }
            [scopeId, scope] = this.prepareScope(nameInfo, finalType, existingReference);
        }

        const instance = this.getTypeInstance(finalType);

        // TODO: reserve need array for labels?
        const id = isReference ? null : instance.reserve(size, nameInfo.name, array, data);

        const reference = new Reference(nameInfo.name, type, isReference, array, id, instance, scopeId,
                                        {container, scope, isStatic: nameInfo.isStatic, data});
        console.log(container, reference);

        if (container) {
            this.containers.addReference(nameInfo.name, reference);
        } else {
            this.references[nameInfo.name] = reference;
        }

        if (initValue !== null) {
            reference.init(reference, initValue);
        }
        return id;
    }
    isDefined(name, indexes = []) {
        const reference = this.getReference(name, false);
        if (!reference) return false;
        return reference.isValidIndexes(indexes);
    }
    hasScope(type) {
        // TODO: inside function ??
        return ['public', 'proofvalue', 'challenge', 'subproofvalue', 'publictable'].includes(type) === false;
    }

    get (name, indexes = []) {
        console.log('GET', name, indexes);

        // getReference produce an exception if name not found
        return this.getReference(name).get(indexes);
    }
    getIdRefValue(type, id) {
        return this.getTypeDefinition(type).instance.getItem(id);
    }
    getLabel(type, id, options) {
        return this.getTypeDefinition(type).instance.getLabel(id, {type, ...options});
    }
    getTypeR(name, indexes, options) {
        const [instance, info] = this._getInstanceAndLocator(name, indexes);
        return [instance.getType(info.locator + info.offset), info.reference, info.array ?? false];
    }
    getItem(name, indexes, options) {

        assert(typeof name === 'string' || (Array.isArray(name) && name.length > 0));

        indexes = indexes ?? [];
        options = options ?? {};

        console.log(name);
        const reference = this.getReference(name);
        const item = reference.getItem(indexes);
        console.log(item);

        EXIT_HERE;

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
        return item;

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
        const explicitContainer = subnames.length > 1 ? subnames.slice(0, -1).join('.') : false;
        const lname = subnames[subnames.length - 1];

        let reference = false;

        if (name === 'MODULE_ID') {
            debugger;
        }
        if (!explicitContainer) {
            reference = this.containers.getReferenceInsideCurrent(lname, false);
        } else {
            if (['proof', 'subproof', 'air'].includes(explicitContainer)) {
                const scopeId = this.scope.getScopeId(explicitContainer);
                if (scopeId === false) {
                    throw new Error(`not found scope ${explicitContainer}`);
                }
                reference = this.references[lname];
                if (reference && reference.scopeId !== scopeId) {
                    throw new Error(`Not match declaration scope and accessing scope (${containerName}) of ${name}`);
                }
            }
            if (reference && this.containers.isDefined(explicitContainer)) {
                reference = this.containers.getReferenceInside(explicitContainer, lname, false);
            }
        }
        if (!reference) {
            reference = this.references[name] ?? false;
        }
        if (!reference) {
            this.containers.getReference(name, false);
        }
        return reference;
    }
    isVisible(def) {
        return !def.scopeId || def.type === 'constant' || def.scopeId >= this.visibilityScope; // || def.scopeId <= this.scope.getScopeId('air');
    }
    getReference(name, defaultValue) {
        // if more than one name is sent, use the first one (mainName). Always first name it's directly
        // name defined on source code, second optionally could be name with subproof, because as symbol is
        // stored with full name.
        const mainName = Array.isArray(name) ? name[0]:name;
        const nameInfo = this.decodeName(mainName);
        let names = false;

        if (nameInfo.scope !== false) {
            // if scope is specified on mainName, the other names don't make sense
            names = [mainName];
        } else if (!nameInfo.absoluteScope && nameInfo.parts.length == 2) {
            // absoluteScope means that first scope was proof, subproof or air. If a non absolute
            // scope is defined perhaps was an alias.
            const container = this.containers.getFromAlias(nameInfo.parts[0], false);
            if (container) {
                // if it's an alias associated with container, replace alias with
                // container associated.
                names = [container + '.' + nameInfo.parts.slice(1).join('.')];
            }
        }

        console.log(names);
        if (!names) {
            names = this.context.getNames(name);
        }

        console.log(names);
        // console.log(`getReference(${name}) on ${this.context.sourceRef} = [${names.join(', ')}]`);
        let reference = false;

        for (const name of names) {
            reference = this.searchDefinition(name);
            if (reference) break;
        }
        if (!reference) {
            if (typeof defaultValue !== 'undefined') return defaultValue;
            throw new Error(`Reference ${names.join(',')} not found`);
        }

        // constants are visible inside functions
        if (this.isVisible(reference) === false) {
            if (typeof defaultValue !== 'undefined') return defaultValue;
            throw new Error(`Reference ${names.join(',')} not visible from current scope`);
        }
        return reference;
    }
    _getInstanceAndLocator (name, indexes) {
        const def = this.getReference(name);
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
        return this.getReference(name, {type: false}).type;
    }
    setReference (name, value) {
        let reference = this.getReference(name);
        // TODO: reference not knows operand types
        if (value instanceof Expression) {
            value = value.getAloneOperand();
            if (value instanceof ReferenceItem) {
                assert(!value.next);
                assert(!value.array);
                const src = this.getReference(value.name);
                if (src.array) {
                    const __array = src.array.getIndexesTypedOffset(value.__indexes);
                    reference.array = __array.array;
                    reference.locator = src.locator + __array.offset;

                } else {
                    reference.array = false;
                    reference.locator = src.locator;
                }
                reference.type = src.type;
                reference.scope = src.scope;
                reference.scopeId = src.scopeId;
            } else if (value instanceof ProofItem) {
                reference.locator = value.id;
                reference.type = value.refType;
                reference.scope = false;
                reference.scopeId = false;
                reference.array = value.array;
            }
        } else if (value instanceof ProofItem) {
            assert(!value.__next);
            reference.locator = value.id;
            reference.type = value.refType;
        } else {
            throw new Error(`Invalid reference`);
        }
    }
    restore (name, reference) {
        this.references[name] = reference;
    }
    set (name, indexes, value) {
        console.log('SET', name, indexes, value);
        assert(value !== null); // to detect obsolete legacy uses

        // getReference produce an exception if name not found
        this.getReference(name).set(value, indexes);
    }

    unset(name) {
        let def = this.references[name];
        if (def.array) delete def.array;
        delete this.references[name];
    }

    *[Symbol.iterator]() {
        for (let index in this.references) {
          yield index;
        }
    }

    *keyValuesOfTypes(types) {
        for (let index in this.references) {
            const def = this.references[index];
            // console.log({index, ...def});
            if (!types.includes(def.type)) continue;
            yield [index, def];
        }
    }

    *values() {
        for (let index in this.references) {
            yield this.references[index];
        }
    }

    *keyValues() {
        for (let index in this.references) {
            yield [index, this.references[index]];
        }
    }
    dump () {
        for (let name in this.references) {
            const def = this.references[index];
            const indexes = def.array === false ? '': def.multiarray.getLengths().join(',');
            // console.log(`${name.padEnd(30)}|${def.type.padEnd(10)}|${indexes}`);
        }
    }
}
