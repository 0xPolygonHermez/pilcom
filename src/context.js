const {assert} = require("chai");
const References = require("./references.js");
const Expressions = require("./expressions.js");
const Router = require("./router.js");

module.exports = class Context {
    constructor (Fr) {
        this.Fr = Fr;
        this.namespace = '';
        this.subproof = false;
        this.stack = [];
        this.config = {debug: {}};
        this.sourceRef = '';
        this.uses = [];
    }

    setNamespace(namespace, subproof) {
        this.namespace = namespace;
        if (typeof subproof !== 'undefined') {
            this.subproof = subproof;
        }
    }
    getSubproof() {
        return this.subproof;
    }
    getNamespace() {
        return this.namespace;
    }
    addUses(scope) {
        this.uses.push(scope);
    }
    clearUses() {
        this.uses = [];
    }
    getNames(name) {
        if (typeof name.name !== 'undefined') {
            console.log(name);
            throw new Error('Invalid name used on getNames');
        }

        let names = typeof name === 'string' ? [name]:name;
        if (!Array.isArray(names) || names.length !== 1) {
            return names;
        }
        name = names[0];
        const fullName = this.getFullName(name);
        return name === fullName ? [name]:[name, fullName];
    }
    decodeName(name) {
        const regex = /((?<subproof>\w*)::)?((?<namespace>\w*)\.)?(?<name>\w+)/gm;

        let m;

        while ((m = regex.exec(name)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            return [m.groups.subproof, m.groups.namespace, m.groups.name];
        }
    }
    getFullName(name) {
        if (typeof name !== 'string') {
            console.log(name);
            throw new Error(`getFullName invalid argument`);
        }

        const parts = name.split('.');
        if (parts.length === 1 && this.subproof !== false && this.subproof !== '') {
            name = this.subproof + '.' + name;
        }
        return name;
    }
    push(namespace, subproof) {
        this.stack.push([this.subproof, this.namespace]);
        this.setNamespace(namespace, subproof);
    }
    pop() {
        [this.subproof, this.namespace] = this.stack.pop();
    }
}
