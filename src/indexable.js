const LabelRanges = require("./label_ranges.js");
module.exports = class Indexable {

    constructor (Fr, type) {
        this.Fr = Fr;
        this.values = [];
        this.type = type;
        this.labelRanges = new LabelRanges();
    }

    getEmptyValue(id, index) {
        return null;
    }
    reserve(count, label, multiarray) {
        const id = this.values.length;
        for (let index = 0; index < count; ++index) {
            const absoluteIndex = index + id;
            this.values[absoluteIndex] = this.getEmptyValue(absoluteIndex, index);
        }
        if (label) {
            this.labelRanges.define(label, id, multiarray);
        }
        return id;
    }

    get(id, offset) {
        return this.values[id + offset]
    }

    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
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
        this.set(id, 0, value);
    }

    set(id, offset, value) {
        console.log([`SET@${this.type}[${id}]`, value]);
        this.values[id] = value;
    }

    unset(id) {
        if (id < this.values.length) {
            delete this.values[id];
        }
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.values.length; ++index) {
          yield this.values[index];
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
