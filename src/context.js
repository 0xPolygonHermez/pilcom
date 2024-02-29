const {assert} = require("chai");
module.exports = class Context {
    static _instance = null;

    constructor (Fr, processor, config = {}) {
        assert(Context._instance === null);
        Context._instance = this;
        this.Fr = Fr;
        this._processor = processor;
        this.namespace = '';
        this.subproof = false;
        this.stack = [];        
        this.config = {debug: {}, ...config};
        this.uses = [];
        this.subproofName = false;
        this.airId = false;
        this.airN = false;
    }
    static get config() {
        return this._instance.config;
    }
    static get expressions() {
        return this._instance._processor.expressions;
    }
    static get runtime() {
        return this._instance._processor.runtime;
    }
    static get scope() {
        return this._instance._processor.scope;
    }
    static get sourceRef() {
        return this._instance._processor.sourceRef;
    }
    static get sourceTag() {
        return this._instance._processor.sourceRef.split('/').slice(-2).join('/');
    }
    static get processor() {
        return this._instance._processor;
    }
    static get current() {
        return this._instance;
    }
    static get references() {
        return this._instance._processor.references;
    }
    static get proofLevel() {
        if (this.airName) {
            return `AIR:${this.airName}`;
        }
        if (this.subproofName) {
            return `SUBPROOF:${this.subproofName}`;
        }
        return 'PROOF';
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

        let names = name;
        if (typeof name === 'string') {
            if (name.includes('${')) {
                name = this.processor.evaluateTemplate(name);
            }
            names = [name];
        }
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
