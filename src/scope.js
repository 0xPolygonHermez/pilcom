module.exports = class Scope {
    constructor (Fr) {
        this.Fr = Fr;
        this.deep = 0;
        this.shadows = [{}];
    }
    setReferences(references) {
        this.references = references;
    }
/*    get(name) {
        if (this.references.isDefined(name)) {
            return this.references.get(name).value;
        }
        return null;
    }

    isDefined(name) {
        return this.references.isDefined(name);
    }

    define(name, value) {
        const previous = this.isDefined(name) ? this.references.get(name) : false;
        if (previous !== false && previous.scope == this.deep) {
            throw new Error(`${name} already defined on this scope ....`);
        }
        this.shadows[this.deep][name] = previous;
        // shadowing
        console.log(`DEFINE VAR ${name} ${value.value}`);
        this.references.set(name, { type: 'var', value: value.value, scope: this.deep });
    }*/
    declare (name, ref) {
        this.shadows[this.deep][name] = ref;
        return this.deep;
    }
/*    __set(name, value) {
        if (!this.isDefined(name)) {
            throw new Error(`${name} not defined on this scope ....`);
        }
        let ref = this.references.get(name);
        ref.value = value;
        console.log(`SET VAR ${name} ${value}`);
        this.references.set(name, ref);
    }*/
    pop () {
        if (this.deep < 1) {
            throw new Error('Out of scope');
        }
        const shadows = this.shadows[this.deep];
        for (const name in shadows) {
            const shadow = shadows[name];
            if (shadow === false) {
                console.log(`UNSET VAR ${name}`);
                this.references.unset(name);
            } else {
                console.log(`SET VAR ${name} ${shadows[name].value}`);
                this.references.set(name, shadows[name]);
            }
        }
        this.shadows[this.deep] = {};
        --this.deep;
        console.log(`POP ${this.deep}`)
    }
    push() {
        ++this.deep;
        console.log(`PUSH ${this.deep}`)
        this.shadows[this.deep] = {};
    }
    *[Symbol.iterator]() {
        for (let index in this.references) {
          yield index;
        }
    }

    *values() {
        for (let index in this.references) {
            yield this.references[index];
        }
    }

    *keyValues() {
        for (let index in this.references) {
            yield [index, this.references[index]];
        }
    }
}
