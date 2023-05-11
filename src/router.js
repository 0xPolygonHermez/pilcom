
module.exports = class Router {

    constructor (parent, property, options = {}) {
        this.parent = parent;
        this.routerProperty = property;
        this.defaultPrefix = options.defaultPrefix ?? '-default-prefix-no-defined-';
        this.message = options.message ?? `Not found routing method {1} for property ${property} = {0}`;
        this.cache = options.cache || {};
    }
    getPropertyValue(e) {
        return e[this.routerProperty];
    }
    getRouteMethod(pvalue, prefix) {
        let key;
        prefix = prefix ?? this.defaultPrefix;
        if (this.cache !== false) {
            key = pvalue + '@' + prefix;
            const cached = this.cache[key];
            if (cached) return cached;
        }

        const method = prefix+((prefix ? '_':'')+pvalue).replace(/[-_][a-z]/g, (group) => group.slice(-1).toUpperCase());
        if (this.cache !== false) this.cache[key] = method;
        return method;
    }
    go(e, prefix) {
        const pvalue = this.getPropertyValue(e);
        const method = this.getRouteMethod(pvalue, prefix);
        if (typeof this.parent[method] !== 'function') {
            throw new Error(this.message.replace(/\{0\}/gi, pvalue).replace(/\{1\}/gi, method));
        }
        return this.parent[method](e);
    }
}
