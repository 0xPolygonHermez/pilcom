module.exports = class Scope {
    constructor (Fr) {
        this.Fr = Fr;
        this.deep = 0;
        this.shadows = [{}];
        this.instanceType = 'instance';
        this.stackInstanceTypes = [];
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
    declare (name, type, ref) {
        this.shadows[this.deep][name] = {type, ref};
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
    pop (excludeTypes = []) {
        if (this.deep < 1) {
            throw new Error('Out of scope');
        }
        const shadows = this.shadows[this.deep];
        for (const name in shadows) {
            const exclude = excludeTypes.includes(shadows[name].type);
            if (exclude) console.log(`Excluding from this scope (${name})....`);
            if (shadows[name].ref === false) {
                if (!exclude) this.references.unset(name);
            } else {
                // I could not 'update' reference name, because was an excluded type. This situation
                // was an error because could exists same name in scope linked.
                if (exclude) {
                    throw new Error(`Excluded type ${shadows[name].type} has shadow reference called ${name}`);
                }
                this.references.set(name, shadows[name].ref);
            }
        }
        this.shadows[this.deep] = {};
        --this.deep;
        // console.log(`POP ${this.deep}`)
    }
    push() {
        ++this.deep;
        // console.log(`PUSH ${this.deep}`)
        this.shadows[this.deep] = {};
    }

    pushInstanceType(type) {
        this.stackInstanceTypes.push(this.instanceType);
        this.instanceType = type;
    }
    popInstanceType() {
        this.instanceType = this.stackInstanceTypes.pop();
        return this.instanceType;
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
