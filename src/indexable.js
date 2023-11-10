const LabelRanges = require("./label_ranges.js");
const {cloneDeep} = require('lodash');
const {assert, assertLog} = require('./assert.js');
const ExpressionItem = require('./expression_items/expression_item.js');
module.exports = class Indexable {
    constructor (type, definitionClass, expressionItemClass, options) {
        this.expressionItemClass = expressionItemClass ?? false;
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
        console.log(`CLEARING ${label} (${this.type})`);
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
        if (this.type === 'subproofvalue') {
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
    getItem(id, properties) {
        let res = this.values[id];
        if (typeof res.getItem === 'function') {
            return res.getItem();
        }
        if (!this.expressionItemClass || res instanceof this.expressionItemClass) {
            return res;
        }
        if (typeof res.value !== 'undefined' && res.value instanceof this.expressionItemClass) {
            return res.value.clone();
        }
        if (typeof res.value === 'undefined') {
            if (this.expressionItemClass.createWithId) {
                return new this.expressionItemClass(id);
            }
            return new this.expressionItemClass();
        }
        assertLog(typeof this.expressionItemClass.createFrom === 'function', [this.type, this.constructor.name, this.expressionItemClass, res, res.value]);
        return this.expressionItemClass.createFrom(res.value);
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
        console.log(item);
        console.log(value.constructor.name);
        // if (value && typeof value.toString === 'function') console.log(value.toString());
        // else console.log(value);
        assertLog(item && typeof item.setValue === 'function', {type: this.type, definition: this.definitionClass, id, item: item});
        item.setValue(value);
/*
        if (typeof this.cls === 'function') {
            if ((value instanceof this.cls) === false) {
                if (this.cls.directValue) {
                    value = new this.cls(value);
                } else {
                    let initValue = value;
                    value = new this.cls(id);
                    console.log(value);
                    value.set(initValue);
                }
            }
        }
        this.values[id] = value;*/
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
                console.log(definition);
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
