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
    getNames(name) {
        if (typeof name.name !== 'undefined') {
            console.log(name);
            throw new Error('Invalid name used on getNames');
        }

        let names = typeof name === 'string' ? [name]:name;
        if (!Array.isArray(names) || names.length !== 1) {
            return names;
        }
        return [names[0], this.getFullName(names[0])];
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
        const parts = this.decodeName(name);
        const [_subproof, _namespace, _name] = [parts[0] ?? this.subproof, parts[1] ?? this.namespace, parts[2]];

        let fullname = '';
        if (_subproof !== '') {
            fullname += _subproof + '::';
        }
        if (_namespace !== '') {
            fullname = _namespace + '.';
        }
        fullname += _name;
        return fullname;
    }
    push(namespace, subproof) {
        this.stack.push([this.subproof, this.namespace]);
        this.setNamespace(namespace, subproof);
    }
    pop() {
        [this.subproof, this.namespace] = this.stack.pop();
    }
}
