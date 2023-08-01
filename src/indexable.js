const LabelRanges = require("./label_ranges.js");
const {cloneDeep} = require('lodash');
const {assert, assertLog} = require('./assert.js');
module.exports = class Indexable {
    constructor (type, cls, rtype) {
        this.cls = cls;
        this.values = [];
        this.type = type;
        this.rtype = rtype ?? type;
        this.labelRanges = new LabelRanges();
        this.debug = false;
        this._undefined = null;
        if (this.cls) {
            try {
                this._undefined = new this.cls();
            } catch (e) { }
        }
    }
    get undefined() {
        if (this._undefined instanceof Object) {
            return cloneDeep(this._undefined);
        }
        return this._undefined;
    }
    getEmptyValue(id) {
        return this.undefined;
    }

    dup() {
        let dup = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        dup.values = [...this.values];
        return dup;
    }
    clear() {
        this.values = [];
        this.labelRanges = new LabelRanges();
    }
    getType(id) {
        return this.rtype;
    }
    reserve(count, label, multiarray) {
        const id = this.values.length;
        for (let index = 0; index < count; ++index) {
            const absoluteIndex = index + id;
            this.values[absoluteIndex] = this.getEmptyValue(absoluteIndex);
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
        if (typeof res === 'undefined') {
           res = this.undefined;
        } else {
            assertLog(!this.cls || res instanceof this.cls, [this.cls.constructor.name, res]);
        }
        if (this.debug) {
            console.log(`GET ${this.constructor.name}.${this.type} @${id} ${res}`);
        }
        return res;
    }

    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
    }

    getTypedValue(id) {
        // const res = { type: this.rtype, value: this.get(id) };
        console.log(['getTypedValue', this.type, this.cls.constructor.name, id]);
        return this.get(id);
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
        if (this.cls) {
            if ((value instanceof this.cls) === false) {
                console.log([this.type, this.cls.constructor.name, value]);
                value = new this.cls(value);
            }
        }
        this.values[id] = value;
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
