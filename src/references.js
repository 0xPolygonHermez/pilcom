const {assert, assertLog} = require('./assert.js');
const MultiArray = require("./multi_array.js");
const Expression = require("./expression.js");
const {ExpressionItem, ArrayOf} = require("./expression_items.js");
const Reference = require('./reference.js');
const Containers = require('./containers.js');
const Context = require('./context.js');
const Exceptions = require('./exceptions.js');
const Debug = require('./debug.js');
module.exports = class References {

    constructor () {
        this.references = {};
        this.types = {};
        this.visibilityScope = 0;
        this.visibilityStack = [];
        this.containers = new Containers(this);
    }
    getDefinitionByItem(item, options = {}) {
        let instance = null;
        const instances = [...(options.instances ?? []), ...Object.values(this.types).map(x => x.instance)];
        for (const _instance of instances) {
            if (Debug.active) console.log(_instance);
            if (_instance.expressionItemClass === item.constructor) {
                instance = _instance;
                break;
            }
        }
        if (Debug.active) console.log(instance, item.id);
        const res = instance.get ? instance.get(item.id): false;
        if (Debug.active) console.log(res);
        return res;
    }
/*    getDefinition(name, indexes) {
        const reference = this.getReference(name);
        const id = reference.getId(indexes);
    }*/
    getArray(name, indexes) {
        const reference = this.getReference(name);
        if (!reference.array) {
            return false;
        }
        return reference.array.applyIndexes(reference, indexes);
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
        this.visibilityScope = Context.scope.deep;
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
    clearType(type, label) {
        const typeInfo = this.types[type];
        if (typeof typeInfo === 'undefined') {
            throw new Error(`type ${type} not registered`);
        }
        typeInfo.instance.clear(label);
        // TODO: remove references
        for (const name in this.references) {
            if (this.references[name].type !== type) continue;
            delete this.references[name];
        }
    }
    clearScope(proofScope) {
        this.containers.clearScope(proofScope);
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
        assert(typeof name === 'string');
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
    getGlobalScope(name, useCurrentContainer = true) {
        const res = this.decodeName(name);
        if (res.absoluteScope) {
            if (res.isProofScope) return 'proof';
            if (res.isSubproofScope) return 'subproof';
            if (res.isAirScope) return 'air';
        }
        if (useCurrentContainer) {
            this.containers.getCurrent();
        }
        return false;
    }
    checkAndGetContainer(nameInfo){
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
            return [Context.scope.declare(nameInfo.name, type, false, nameInfo.scope), nameInfo.scope];
        }

        const scopeId = this.hasScope(type) ? Context.scope.declare(nameInfo.name, type, existingReference, false) : 0;
        if (nameInfo.name === 'Main.jmp') {
            console.log(scopeId);
            console.log(existingReference);
            // EXIT_HERE;
        }
        // scope(name, def) => exception !!!
        //                  => scopeId;
        if (existingReference !== false && this.isVisible(existingReference)) {
            if  (existingReference.scopeId === scopeId || existingReference.scope === false || scopeId === false) {
                throw new Error(`At ${Context.sourceRef} is defined ${nameInfo.name}, but ${existingReference.name} as ${existingReference.type} was defined previously on ${existingReference.data.sourceRef}`)
            }
        }
        return [scopeId, false];
    }
    declare(name, type, lengths = [], options = {}, initValue = null) {
        assert(typeof name === 'string');
        assert(!name.includes('::object'));
        assert(!name.includes('.object'));

        const nameInfo = this.decodeName(name);
        if (name === 'Main.jmp') { console.log(nameInfo); }
        console.log(`DECLARE_REFERENCE ${name} ==> ${nameInfo.name} ${type} ${lengths.length ? '[' + lengths.join(',') + '] ': ''}scope:${nameInfo.scope} #${Context.scope.deep} ${initValue}[type: ${initValue instanceof Object ? initValue.constructor.name : typeof initValue}]`, options);

        let [array, size] = Reference.getArrayAndSize(lengths);
        if (Debug.active) console.log(name, lengths, array, size);

        let refname = nameInfo.name;
        let internalReference = false;
        if (nameInfo.absoluteScope === false && nameInfo.parts.length === 2) {
            const _ref = this.references[nameInfo.parts[1]] ?? false;
            internalReference = _ref;
        }
        const existingReference = this.references[nameInfo.name] ?? internalReference;
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

        /* take constant property from options, the rest is data information */
        const constProperty = options.const ?? false;
        let data = {...options};
        delete data.const;

        const refProperties = {container, scope, isStatic: nameInfo.isStatic, data, const: constProperty};


        // TODO: reserve need array for labels?
        const id = isReference ? null : instance.reserve(size, nameInfo.name, array, data);

        const reference = new Reference(nameInfo.name, type, isReference, array, id, instance, scopeId, refProperties);

        if (container) {
            this.containers.addReference(nameInfo.name, reference);
        } else {
            this.references[nameInfo.name] = reference;
        }

        if (initValue !== null) {
            if (Debug.active) {
                if (initValue && typeof initValue.toString === 'function') console.log(initValue.toString());
                else console.log(initValue);
            }
            reference.init(initValue);
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
        assertLog(typeof name === 'string', name);
        if (Debug.active) console.log('GET', name, indexes);

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
        const reference = this.getReference(name);
        const item = reference.getItem(indexes);
        return [item, reference.isReference];
    }
    getItem(name, indexes, options) {

        assert(typeof name === 'string' || (Array.isArray(name) && name.length > 0));

        if (Debug.active) console.log(indexes);
        indexes = indexes ?? [];
        options = options ?? {};

        const reference = this.getReference(name);
        // TODO: if reference is a 'reference' check if name is correct
        const item = reference.getItem(indexes, {...options, label: reference.name});


        if (options.preDelta) {
            EXIT_HERE;
            console.log(typeof tvalue.value);
            assert(typeof tvalue.value === 'number' || typeof tvalue.value === 'bigint');
            tvalue.value += options.preDelta;
            instance.set(info.locator + info.offset, tvalue.value);
        }
        if (options.postDelta) {
            EXIT_HERE;
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
            if (Debug.active) console.log(typeof tvalue.value);
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
        this.containers.addUse(name);
    }
    searchDefinition(name) {
        const subnames = name.split('.');
        const explicitContainer = subnames.length > 1 ? subnames.slice(0, -1).join('.') : false;
        const lname = subnames[subnames.length - 1];

        let reference = false;
        if (!explicitContainer) {
            reference = this.containers.getReferenceInsideCurrent(lname, false);
        } else {
            if (['proof', 'subproof', 'air'].includes(explicitContainer)) {
                const scopeId = Context.scope.getScopeId(explicitContainer);
                if (scopeId === false) {
                    throw new Error(`not found scope ${explicitContainer}`);
                }
                reference = this.references[lname];
                if (reference && reference.scopeId !== scopeId) {
                    throw new Error(`Not match declaration scope and accessing scope (${containerName}) of ${name}`);
                }
            }
            if (!reference && this.containers.isDefined(explicitContainer)) {
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
        if (Debug.active) console.log('ISVISIBLE', (def.constructor ?? {name: '_'}).name, def);
        return !def.scopeId || !this.hasScope(def.type) || ['constant', 'function'].includes(def.type) ||
                def.scopeId >= this.visibilityScope; // || def.scopeId <= Context.scope.getScopeId('air');
    }
    /**
     *
     * @param {string|string[]} name
     * @param {*} defaultValue
     * @param {Object} debug
     * @returns {Reference}
     */
    getReference(name, defaultValue, debug = {}) {
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

        if (Debug.active) console.log(names);
        if (!names) {
            names = Context.current.getNames(name);
        }

        if (Debug.active) console.log(names);
        // console.log(`getReference(${name}) on ${this.context.sourceRef} = [${names.join(', ')}]`);
        let reference = false;

        for (const name of names) {
            reference = this.searchDefinition(name);
            if (reference) break;
        }
        if (!reference) {
            if (typeof defaultValue !== 'undefined') return defaultValue;
            throw new Exceptions.ReferenceNotFound(names.join(','));
        }

        // constants are visible inside functions
        if (this.isVisible(reference) === false) {
            if (typeof defaultValue !== 'undefined') return defaultValue;
            throw new Exceptions.ReferenceNotVisible(names.join(','));
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
        if (Debug.active) console.log('SET', name, indexes, value);
        assert(value !== null); // to detect obsolete legacy uses

        // getReference produce an exception if name not found
        const reference = this.getReference(name);
        reference.set(value, indexes);
    }
    unset(name) {
        let def = this.references[name];
        if (def.array) delete def.array;
        delete this.references[name];
    }
    unsetProperty(property, values) {
        this.containers.unsetProperty(property, values);
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
