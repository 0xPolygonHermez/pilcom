const {assert} = require("chai");
const References = require("./references.js");
const Expressions = require("./expressions.js");
const Router = require("./router.js");

module.exports = class Context {
    constructor (Fr) {
        this.Fr = Fr;
        this.namespace = false;
        this.subair = false;
        this.stack = [];
    }

    setNamespace(namespace, subair) {
        this.namespace = namespace;
        if (typeof subair !== 'undefined') {
            this.subair = subair;
        }
    }
    getSubair() {
        return this.subair;
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
        const regex = /((?<subair>\w*)::)?((?<namespace>\w*)\.)?(?<name>\w+)/gm;

        let m;

        while ((m = regex.exec(name)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            return [m.groups.subair, m.groups.namespace, m.groups.name];
        }
    }
    getFullName(name) {
        if (typeof name !== 'string') {
            console.log(name);
            throw new Error(`getFullName invalid argument`);
        }
        const parts = this.decodeName(name);
        const [_subair, _namespace, _name] = [parts[0] ?? this.subair, parts[1] ?? this.namespace, parts[2]];

        let fullname = '';
        if (_subair !== '') {
            fullname += _subair + '::';
        }
        if (_namespace !== '') {
            fullname = _namespace + '.';
        }
        fullname += _name;
        return fullname;
    }
    push(namespace, subair) {
        this.stack.push([this.subair, this.namespace]);
        this.setNamespace(namespace, subair);
    }
    pop() {
        [this.subair, this.namespace] = this.stack.pop();
    }
}
