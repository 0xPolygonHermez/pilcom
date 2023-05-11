module.exports = class Constraints {

    constructor (Fr, expressions) {
        this.Fr = Fr;
        this.constraints = [];
        this.expressions = expressions;
    }

    get(id) {
        return this.values[id];
    }

    isDefined(id) {
        return (typeof this.values[id] != 'undefined');
    }

    define(left, right, boundery, sourceRef) {

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
