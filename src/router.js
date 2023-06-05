
module.exports = class Router {

    constructor (parent, property, options = {}) {
        this.parent = parent;
        this.routerProperty = property;
        this.defaultPrefix = options.defaultPrefix ?? '-default-prefix-no-defined-';
        this.message = options.message ?? `Not found routing method {1} for property ${property} = {0}`;
        this.cache = options.cache || {};
        this.multiParams = options.multiParams || false;
        this.prefunc = options.pre || false;
        this.postfunc = options.post || false;
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
    go(params, prefix) {
        params = this.multiParams && Array.isArray(params) ? params : [params];
        const e = params[0];
        const pvalue = this.getPropertyValue(e);
        const method = this.getRouteMethod(pvalue, prefix);
        if (typeof this.parent[method] !== 'function') {
            throw new Error(this.message.replace(/\{0\}/gi, pvalue).replace(/\{1\}/gi, method));
        }
        if (this.prefunc) this.prefunc.apply(this.parent, [method, ...params]);
        let res = this.parent[method].apply(this.parent, params);
        if (this.postfunc) res = this.prefunc.apply(this.parent, [method, res, ...params]);
        return res;
    }
    goBy(pvalue, ...params) {
        const method = this.getRouteMethod(pvalue);
        if (typeof this.parent[method] !== 'function') {
            console.log('PARAMS-GOBY');
            console.log(params);
            console.log('PVALUE-GOBY');
            console.log(pvalue);
            throw new Error(this.message.replace(/\{0\}/gi, pvalue).replace(/\{1\}/gi, method));
        }
        return this.parent[method].apply(this.parent, params);
    }
}
