const LabelRanges = require("./label_ranges.js");
const {cloneDeep} = require('lodash');
const {assert, assertLog} = require('./assert.js');
module.exports = class Indexable {
    constructor (type, cls, options) {
        this.cls = cls ?? false;
        this.values = [];
        this.type = type;
        this.options = options ?? {}
        this.rtype = this.options.rtype ?? type;
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
    clear() {
        this.values = [];
        this.labelRanges = new LabelRanges();
    }
    getType(id) {
        return this.rtype;
    }
    getEmptyValue(id, data) {
        return null;
    }
    reserve(count, label, multiarray, data) {
        const id = this.values.length;
        for (let index = 0; index < count; ++index) {
            const absoluteIndex = index + id;
            this.values[absoluteIndex] = this.getEmptyValue(absoluteIndex, data);
            if (this.debug) {
                console.log(`INIT ${this.constructor.name}.${this.type} @${absoluteIndex} (${id}+${index}) ${this.values[absoluteIndex]} LABEL:${label}`);
            }
        }
        if (label) {
            this.labelRanges.define(label, id, multiarray);
        }
        return id;
    }
    get(id) {
        let res = this.values[id];
        if (typeof res === 'undefined' || res === null) {
            return this.getEmptyValue(id);
        }
        return res;
    }
    getItem(id, properties) {
        let res = this.get(id);
        if (this.cls && (res instanceof this.cls) === false) {
            properties = properties ?? {};
            res = new this.cls(this.id);
            for (const property in properties) {
                res[property] = properties[property];
            }
        }
        return res;
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

    set(id, value) {
        this.values[id] = value;
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
          yield this.values[index] ?? this.undefined;
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
}
