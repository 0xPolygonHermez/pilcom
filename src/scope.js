module.exports = class Scope {

    // pol haven't scope

    constructor (Fr) {
        this.Fr = Fr;
        this.vars = {};
        this.scope = 0;
        this.shadows = [{}];
    }

    get(name) {
        if (this.isDefined(name)) {
            return this.vars[name].value;
        }
        return null;
    }

    isDefined(name) {
        return (name in this.vars);
    }

    define(name, value) {
        const previous = name in this.vars ? this.vars[name] : false;
        if (previous !== false && previous.scope == this.scope) {
                throw new Error(`${name} already defined on this scope ....`);
        }
        console.log(this.scope);
        console.log(['shadows', this.shadows]);
        this.shadows[this.scope][name] = previous;
        // shadowing

        this.vars[name] = { value, scope: this.scope };
    }

    set(name, value) {
        if (!this.isDefined(name)) {
            throw new Error(`${name} not defined on this scope ....`);
        }
        this.vars[name].value = value;
    }
    pop() {
        if (this.scope < 1) {
            throw new Error('Out of scope');
        }
        const shadows = this.shadows[this.scope];
        for (const name in shadows) {
            const shadow = shadows[name];
            console.log(['shadow', name, shadow]);
            if (shadow === false) {
                console.log(this.vars);
                delete (this.vars[name]);
                console.log(this.vars);
            } else {
                this.vars[name] = shadows[name];
            }
        }
        this.shadows[this.scope] = {};
        --this.scope;
    }
    push() {
        ++this.scope;
        this.shadows[this.scope] = {};
    }
    *[Symbol.iterator]() {
        for (let index in this.vars) {
          yield index;
        }
    }

    *values() {
        for (let index in this.vars) {
            yield this.vars[index];
        }
    }

    *keyValues() {
        for (let index in this.vars) {
            yield [index, this.vars[index]];
        }
    }
}
