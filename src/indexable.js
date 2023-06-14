const LabelRanges = require("./label_ranges.js");
module.exports = class Indexable {

    constructor (Fr, type) {
        this.Fr = Fr;
        this.values = [];
        this.type = type;
        this.labelRanges = new LabelRanges();
    }

    getType(id) {
        return this.type;
    }
    getEmptyValue(id) {
        return null;
    }
    reserve(count, label, multiarray) {
        const id = this.values.length;
        for (let index = 0; index < count; ++index) {
            const absoluteIndex = index + id;
            this.values[absoluteIndex] = this.getEmptyValue(absoluteIndex);
        }
        if (label) {
            this.labelRanges.define(label, id, multiarray);
        }
        return id;
    }

    get(id) {
        return this.values[id]
    }

    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
    }

    getTypedValue(id) {
        const res = { type: this.type, value: this.values[id] };
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
