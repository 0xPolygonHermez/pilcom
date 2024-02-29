const {assert, assertLog} = require("./assert.js");

module.exports = class Values {
    #values;
    #mutable;
    constructor () {
        this.#values = [];
        this.#mutable = true;
    }
    get mutable() {
        return this.#mutable;
    }
    set mutable(value) {
        let _value = Boolean(value);
        if (_value === this.#mutable) {
            return;
        }
        if (value) {
            this.cloneValues();
        }
        this.#mutable = value;
    }
    clone(cloneValues = false, cloneEachValue = true) {
        let cloned = new Values();
        cloned.#values = this.#values;
        if (this.#mutable || cloneValues) {
            cloned.cloneValues(cloneEachValue);
        } else {
            cloned.#mutable = false;
        }
        return cloned;
    }
    cloneValues(cloneEachValue = true) {
        console.log('\x1B[1;33m************** CLONEVALUES *****************\x1B[0m');
        let _values = this.#values;
        this.#values = [];
        for(const _value of _values) {
            this.#values.push((cloneEachValue && _value && typeof _value.clone === 'function') ?_value.clone() : _value);
        }
    }
    setValue(irow, value) {
        if (!this.#mutable) {
            throw new Error(`modifying an inmutable values irow = ${row} and value = ${value}`);
        }
        this.#values[irow] = value;
    }
    __setValue(irow, value) {
        this.#values[irow] = value;
    }
    getValue(irow) {
        return this.#values[irow];
    }
    toString() {
        return this.#values.join();
    }
    __setValues(values) {
        this.#values = values;
    }
}
