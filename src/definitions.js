module.exports = class Definitions {

    constructor (Fr) {
        this.Fr = Fr;
        this.definitions = {};
    }

    get(name) {
        if (this.isDefined(name)) {
            return this.definitions[name];
        }
        return null;
    }

    isDefined(name) {
        return (name in this.definitions);
    }

    define(name, value) {
        if (this.isDefined(name)) {
            throw new Error(`${name} already defined on ....`);
        }
        this.definitions[name] = value;
    }

    set(name, value) {
        this.definitions[name] = value;
    }

    unset(name) {
        delete this.definitions[name];
    }

    *[Symbol.iterator]() {
        for (let index in this.definitions) {
          yield index;
        }
    }

    *values() {
        for (let index in this.definitions) {
            yield this.definitions[index];
        }
    }

    *keyValues() {
        for (let index in this.definitions) {
            yield [index, this.definitions[index]];
        }
    }
    dump () {
        for (let index in this.definitions) {
            console.log(`${index}: ${this.definitions[index]}`);
        }
    }
}
