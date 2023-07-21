module.exports = class Scope {
    constructor (Fr) {
        this.Fr = Fr;
        this.deep = 0;
        this.shadows = [{}];
        this.properties = [{}];
        this.labels = {};
        this.instanceType = 'air';
        this.stackInstanceTypes = [];
    }
    mark(label) {
        this.labels[label] = this.deep;
    }
    getScopeId(label = false) {
        return label === false ? this.deep : (this.labels[label] ?? false);
    }
    purgeLabels() {
        for (const label in this.labels) {
            if (this.labels[label] > this.deep) {
                // console.log(`PURGE SCOPE LABEL ${label}`);
                delete this.labels[label];
            }
        }
    }
    setReferences(references) {
        this.references = references;
    }
    addToScopeProperty(property, value) {
        if (typeof this.properties[this.deep][property] === 'undefined') {
            this.properties[this.deep][property] = [value];
            return;
        }
        this.properties[this.deep][property].push(value);
    }
    setScopeProperty(property, value) {
        this.properties[this.deep][property] = value;
    }
    getScopeProperty(property, defaultValue = []) {
        return this.properties[this.deep][property] ?? defaultValue;
    }
    declare (name, type, ref, scope = false) {
        // console.log(`[SCOPE] DECLARE ${name} scope:${scope} deep:${this.deep}`);
        if (scope === false) scope = this.deep;
        else if (typeof scope === 'string') {
            const lscope = this.labels[scope];
            if (typeof lscope === 'undefined') {
                throw new Error(`Scope ${scope} not found`);
            }
            scope = lscope;
        }
        this.shadows[scope][name] = {type, ref};
        return scope;
    }
    pop (excludeTypes = []) {
        if (this.deep < 1) {
            throw new Error('Out of scope');
        }
        const shadows = this.shadows[this.deep];
        for (const name in shadows) {
            const exclude = excludeTypes.includes(shadows[name].type);
            // if (exclude) console.log(`Excluding from this scope (${name})....`);
            // console.log(`POP ${name}`);
            // console.log(shadows[name]);
            if (shadows[name].ref === false) {
                if (!exclude) this.references.unset(name);
            } else {
                // I could not 'update' reference name, because was an excluded type. This situation
                // was an error because could exists same name in scope linked.
                if (exclude) {
                    throw new Error(`Excluded type ${shadows[name].type} has shadow reference called ${name}`);
                }
                this.references.restore(name, shadows[name].ref);
            }
        }
        this.shadows[this.deep] = {};
        for (const property in this.properties[this.deep]) {
            this.references.unsetProperty(property, this.properties[this.deep][property]);
        }
        this.properties[this.deep] = {};
        --this.deep;
        this.purgeLabels();
        // console.log(`POP ${this.deep}`)
    }
    push(label = false) {
        ++this.deep;
        // console.log(`PUSH ${this.deep}`)
        this.shadows[this.deep] = {};
        this.properties[this.deep] = {};
        if (label !== false) {
            this.mark(label);
        }
        return this.deep;
    }

    pushInstanceType(type) {
        this.stackInstanceTypes.push(this.instanceType);
        this.push(type);
        this.instanceType = type;
    }
    popInstanceType() {
        this.instanceType = this.stackInstanceTypes.pop();
        this.pop();
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
