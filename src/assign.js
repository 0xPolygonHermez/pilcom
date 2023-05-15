const References = require("./references.js");
const Expressions = require("./expressions.js");
const Router = require("./router.js");

module.exports = class Assign {
    constructor (Fr, parent, references, expressions) {
        this.Fr = Fr;
        this.references = references;
        this.expressions = expressions;
        this.parent = parent;
        this.router = new Router(this, false, {defaultPrefix: '_assignType', multiParams: true});
    }

    assign (name, indexes, value) {
        const [instance, info] = this.references.getTypeInfo(name);
        if (indexes.length > 0 || info.array) {
            throw new Error('Assignation to array not support at moment');
        }
        const type = instance.getType(info.locator, info.offset);
        this.router.goBy(type, name, indexes, value);
        // console.log(info);
    }
    _assignTypeInt(name, indexes, value, type) {
        const v = this.expressions.e2value(value);
        if (typeof v === 'number' || typeof v === 'bigint') {
            return this.references.set(name, [], v);
        }
        console.log(v);
        EXIT_HERE;
    }
}
