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
    getNames(e) {
        return [e.name, this.getFullName(e)];
    }
    getFullName(e) {
        const _namespace = (((e.namespace ?? 'this') === 'this') ? this.namespace : e.namespace);
        const _subair = (((e.subair ?? 'this') === 'this') ? this.subair : e.subair);

        let name = '';
        if (_subair !== '') {
            name += _subair + '::';
        }
        if (_namespace !== '') {
            name = _namespace + '.';
        }
        name += e.name;
        return name;
    }
    push(namespace, subair) {
        this.stack.push([this.subair, this.namespace]);
        this.setNamespace(namespace, subair);
    }
    pop() {
        [this.subair, this.namespace] = this.stack.pop();
    }
}
