const LabelRanges = require("./label_ranges.js");
const {cloneDeep} = require('lodash');
const {assert, assertLog} = require('./assert.js');
const ExpressionItem = require('./expression_items/expression_item.js');
const Debug = require('./debug.js');
const Context = require('./context.js');
module.exports = class Indexable {
    constructor (type, definitionClass, expressionItemClass, options = {}) {
        this.expressionItemClass = expressionItemClass ?? false;
        this.expressionItemConstClass = options.constClass ?? expressionItemClass;
        this.definitionClass = definitionClass ?? false;
        this.values = [];
        this.type = type;
        this.options = options ?? {}
        this.rtype = this.options.rtype ?? type;
        assertLog(this.expressionItemClass.prototype instanceof ExpressionItem, expressionItemClass);
        this.labelRanges = new LabelRanges();
        this.debug = false;
    }
    get length() {
        return this.values.length;
    }
    clone() {
        let cloned = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        cloned.values = [];
        for (const value of this.values) {
            let clonedValue = value;
            if (typeof value.clone === 'function') {
               clonedValue = value.clone();
            } else if (value instanceof Object) {
               clonedValue = Object.assign(Object.create(Object.getPrototypeOf(value)), value);
            }
            cloned.values.push(clonedValue);
        }
        cloned.labelRanges = this.labelRanges.clone();

        return cloned;
    }
    clear(label = '') {
        if (Debug.active) console.log(`CLEARING ${label} (${this.type})`);
        this.values = [];
        this.labelRanges = new LabelRanges();
    }
    getType(id) {
        return this.rtype;
    }
    getEmptyValue(id, data = {}) {
        if (this.definitionClass) {
            return new this.definitionClass(id, data);
        }
        return null;
    }
    reserve(count, label, multiarray, data) {
        if (this.type === 'subproofvalue' && Debug.active) {
            console.log(['SUBPROOFVALUE-R', data]);
        }
        const id = this.values.length;
        for (let index = 0; index < count; ++index) {
            const absoluteIndex = index + id;
            const _label = label + (multiarray ? multiarray.offsetToIndexesString(index) : '');
            this.values[absoluteIndex] = this.getEmptyValue(absoluteIndex, {...data, label: _label});
            if (this.debug) {
                console.log(`INIT ${this.constructor.name}.${this.type} @${absoluteIndex} (${id}+${index}) ${this.values[absoluteIndex]} LABEL:${label}`);
            }
        }
        if (label) {
            this.labelRanges.define(label, id, multiarray);
        }
        return id;
    }
    // get definition object
    get(id) {
        let res = this.values[id];
        if (res === null) {
            return this.getEmptyValue(id);
        }
        return res;
    }
    getConstItem(id, properties) {
        // by default getConstItem return same as getItem but with property const = true.
        return this.getItem(id, {...properties, const: true});
    }
    // get expression item to add in a expression
    getItem(id, properties = {}) {
        let res = this.values[id];
        const isConst = (properties.const && this.expressionItemConstClass);
        const itemClass = isConst ? this.expressionItemConstClass : this.expressionItemClass;
        if (Debug.active) {
            console.log([id, itemClass.name, properties, this.expressionItemConstClass, res]);
            console.log([id, itemClass.name, properties, this.expressionItemConstClass, res.constructor ? res.constructor.name :res.name, res.value ? res.value.constructor.name : '', res]);
        }
        if (isConst && typeof res.getConstItem === 'function') {
            return res.getConstItem();
        }
        if (typeof res.getItem === 'function') {
            return res.getItem();
        }
        if (!itemClass || res instanceof itemClass) {
            return res;
        }
        if (typeof res.value !== 'undefined' && res.value instanceof itemClass) {
            return res.value.clone();
        }
        if (typeof res.value === 'undefined') {
            if (this.expressionItemClass.createWithId) {
                return new itemClass(id);
            }
            return new itemClass();
        }
        assertLog(typeof itemClass.createFrom === 'function', [this.type, this.constructor.name, itemClass, res, res.value]);
        return itemClass.createFrom(res.value, {id, instance: this});
    }

    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
    }

    isDefined(id) {
        return (typeof this.values[id] != 'undefined')
    }

    define(id, value) {
        if (this.isDefined(id)) {
            throw new Error(`${id} already defined on ....`)
        }
        this.set(id, value);
    }
    getLastId() {
        return this.values.length === 0 ? false : this.values.length - 1;
    }
    getNextId() {
        return this.values.length;
    }
    set(id, value) {
        const item = this.get(id);
        assertLog(item, {type: this.type, definition: this.definitionClass, id, item});
        if (typeof item.setValue !== 'function') {
            throw new Error(`Invalid assignation at ${Context.sourceRef}`);
        }
        item.setValue(value);
        if (this.debug) {
            console.log(`SET ${this.constructor.name}.${this.type} @${id} ${value}`);
        }
    }

    unset(id) {
        if (id < this.values.length) {
            delete this.values[id];
        }
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.values.length; ++index) {
          yield this.get(index);
        }
    }

    *values() {
        for (let value of this.values) {
            yield value;
        }
    }

    *keyValues() {
        for (let index = 0; index < this.values.length; ++index) {
            yield [index, this.values[index]];
        }
    }
    dump () {
        console.log(`DUMP ${this.type} #:${this.values.length}`);
        for (let index = 0; index < this.values.length; ++index) {
            const value = this.values[index];
/*            if (value && typeof value.dump === 'function') {
                console.log(`#### ${this.type} ${index} ####`);
                value.dump();
            }*/
            console.log(`${index}: ${this.values[index]}`);
        }
    }
    countByProperty(property) {
        let res = {};
        for (let index = 0; index < this.values.length; ++index) {
            const value = this.get(index);
            const key = value[property];
            res[key] = (res[key] ?? 0) + 1;
        }
        return res;
    }
    getPropertyValues(property) {
        let res = [];
        let isArray = Array.isArray(property);
        const properties = isArray ? property : [property];
        for (let index = 0; index < this.values.length; ++index) {
            let value;
            let pvalues = [];
            for (const _property of properties) {
                const definition = this.get(index);
                if (Debug.active) console.log(definition);
                value = _property === 'id' ? definition.id ?? index : definition[_property];
                if (isArray) {
                    pvalues.push(value);
                }
            }
            res.push(isArray ? pvalues : value);
        }
        return res;
    }
    getPropertiesString(properties, options = {}) {
        let res = [];
        for (let index = 0; index < this.values.length; ++index) {
            const definition = this.get(index);
            let propValues = [];
            for (const property of properties) {
                propValues.push(definition[property] ?? '');
            }
            res.push(this.getLabel(id)+'@'+id+':'+propValues.join(','));
        }
        return res.join('#');
    }
}
