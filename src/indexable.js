const LabelRanges = require("./label_ranges.js");
module.exports = class Indexable {

    constructor (Fr, type) {
        this.Fr = Fr;
        this.values = [];
        this.type = type;
        this.labelRanges = new LabelRanges();
    }

    reserve(count, label, multiarray) {
        const id = this.values.length;
        for (let index = 0; index < count; ++index) {
            this.values[index + id] = null;
        }
        if (label) {
            this.labelRanges.define(label, id, multiarray);
        }
        return id;
    }

    get(id, offset) {
        return this.values[id + offset]
    }

    getLabel(id, offset, options) {
        return this.labelRanges.getLabel(id, offset, options);
    }

    getTypedValue(id, offset) {
        const res = { type: this.type, value: this.values[id + offset] };
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

    set(id, offset, value) {
        console.log(`\x1B[31mSET@${this.type}(${id}, ${offset}, ${value})\x1B[0m`);
        this.values[id+offset] = value;
    }

    unset(id) {
        if (id < this.values.length) {
            delete this.values[id];
        }
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.values.length; ++index) {
          yield index;
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
        console.log(`DUMP ${this.type}`);
        for (let index = 0; index < this.values.length; ++index) {
            const value = this.values[index];
            if (value && typeof value.dump === 'function') {
                console.log(`#### ${this.type} ${index} ####`);
                value.dump();
            }
            console.log([index, this.values[index]]);
        }
    }
}
