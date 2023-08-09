const {assert, assertLog} = require('./assert.js');
module.exports = class Containers {

    constructor (parent,context, scope) {
        this.parent = parent;
        this.context = context;
        this.scope = scope;
        this.containers = {};
        this.current = false;
        this.uses = [];
        this.aliases = [];
    }
    addScopeAlias(alias, value) {
        // NOTE: there is no need to check for aliases because by grammatical definition,
        // aliases must be an identifier

        if (this.aliases[alias]) {
            throw new Error(`Alias ${alias} already defined on ${this.aliases[alias].sourceRef}`);
        }

        this.scope.addToScopeProperty('aliases', alias);
        this.aliases[alias] = {container: value, sourceRef: this.context.sourceRef};
    }
    getAlias(alias, defaultValue) {
        return this.aliases[alias] ?? defaultValue;
    }
    getFromAlias(alias, defaultValue) {
        return this.getAlias(alias, {container: defaultValue}).container;
    }
    unsetAlias(aliases) {
        for (const alias of aliases) {
            assert(this.aliases[alias]);
            delete this.aliases[alias];
        }
    }
    unsetUses(uses) {
        let count = uses.length;
        while (count > 0) {
            const use1 = this.uses.pop();
            const use2 = uses.pop();
            assert(use1 === use2);
            --count;
        }
    }
    unsetProperty(property, values) {
        switch (property) {
            case 'aliases': return this.unsetAlias(values);
            case 'uses': return this.unsetUses(values);
        }
        throw new Error(`unsetProperty was called with invalid property ${property}`);
    }
    create(name, alias = false)
    {
        if (this.current !== false) {
            throw new Error(`Container ${this.current} is open, must be closed before start new container`);
        }

        // console.log(`createContainer(${name},${alias}) at ${this.context.sourceRef}`);
        // if container is defined, contents is ignored but alias must be defined
        if (alias) {
            this.addScopeAlias(alias, name);
        }

        console.log(`CREATE CONTAINER ${name}`);
        // if container is defined, contents is ignored
        if (this.containers[name]) {
            return false;
        }

        // const nameInfo = this.decodeName(name).scope;
        ;
        this.containers[name] = {scope: this.parent.getNameScope(name), alias, definitions: {}};
        this.current = name;
        return true;
    }
    inside() {
        return this.current;
    }
    getCurrent() {
        return this.current;
    }
    close(){
        this.current = false;
    }
    isDefined(name) {
        return (this.containers[name] ?? false) !== false;
    }
    get (name) {
        return this.containers[name] ?? false;
    }
    addReference(name, reference) {
        if (this.current === false) {
            throw new Error(`Could add reference ${name} to closed container`);
        }
        const container = this.containers[this.current];
        if (container.references[name]) {
            throw new Error(`Reference ${name} was declared previously on scope ${this.current}`);
        }
        container.references[name] = reference;
    }
    addUse(name) {
        if (!this.containers[name]) {
            // TODO: defined must be check containers
            throw new Exception(`Use not created container ${name}`);
        }
        this.scope.addToScopeProperty('uses', name);
        this.uses.push(name);
    }
    getReferenceInside(container, name, defaultValue) {
        return this.#getReference(name, defaultValue, container, false);
    }
    getReferenceInsideCurrent(name, defaultValue) {
        return this.#getReference(name, defaultValue, this.current, false);

    }
    getReference(name, defaultValue) {
        return this.#getReference(name, defaultValue, this.current, true);
    }
    #getReference(name, defaultValue, container, useAlias) {
        const nameInfo = this.decodeName(Array.isArray(name) ? name[0]:name);
        let names;
        if (nameInfo.scope !== false) {
            names = [Array.isArray(name) ? name[0]:name];
        } else if (!nameInfo.absoluteScope && nameInfo.parts.length == 2) {
            // console.log(['getScopeAlias',nameInfo.parts[0]]);
            const container = this.getAlias(nameInfo.parts[0], {container: false}).container;
            if (container) {
                names = [container + '.' + nameInfo.parts.slice(1).join('.')];
            }
        }
        if (!names) {
            names = this.context.getNames(name);
        }
        // console.log(`getReference(${name}) on ${this.context.sourceRef} = [${names.join(', ')}]`);
        let reference;

        for (const name of names) {
            reference = this.searchDefinition(name);
            if (reference) break;
        }
        if (reference) {
            if (typeof defaultValue !== 'undefined') return defaultValue;
            throw new Error(`Reference ${names.join(',')} not found`);
        }

        // constants are visible inside functions
        if (this.isVisible(reference) === false) {
            if (typeof defaultValue !== 'undefined') return defaultValue;
            throw new Error(`Reference ${names.join(',')} not visible from current scope`);
        }
        let iuse = this.uses.length;
        while (!def && iuse > 0) {
            --iuse;
            def = this.containers[this.uses[iuse]].definitions[name];
        }
        return reference;
    }
    *[Symbol.iterator]() {
        for (let name in this.containers) {
          yield name;
        }
    }
}
