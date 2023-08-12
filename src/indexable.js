const LabelRanges = require("./label_ranges.js");
module.exports = class Indexable {

    constructor (Fr, type, rtype) {
        this.Fr = Fr;
        this.values = [];
        this.type = type;
        this.rtype = rtype ?? type;
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
        const res = this.values[id] ?? this.undefined;
        /* if (typeof res === 'number') {
            console.log([id, this.type, res]);
            throw new Error('Invalid value');
        }*/
        if (this.debug) {
            console.log(`GET ${this.constructor.name}.${this.type} @${id} ${res}`);
        }
        return res;
    }

    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
    }

    getTypedValue(id) {
        const res = { type: this.rtype, value: this.get(id) };
        return res;
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
        if (typeof value === 'number') {
            console.log([id, this.type, value]);
            throw new Error('Invalid value');
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
