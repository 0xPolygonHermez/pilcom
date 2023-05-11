module.exports = class Indexable {

    constructor (Fr, type) {
        this.Fr = Fr;
        this.values = [];
        this.type = type;
    }

    reserve(count) {
        const id = this.values.length;
        for (let index = 0; index < count; ++index) {
            this.values[index + id] = null;
        }
        return id;
    }

    get(id, offset) {
        return this.values[id + offset]
    }

    getTypedValue(id, offset) {
        const res = { type: this.type, value: this.values[id + offset] };
        console.log(res);
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
        for (let index = 0; index < this.values.length; ++index) {
            console.log(`${index}: ${this.values[index]}`);
        }
    }
}
