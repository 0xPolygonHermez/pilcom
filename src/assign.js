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
        // type
        const [type, reference] = this.references.getTypeR(name, indexes)
        // routing by type
        this.router.goBy(type, name, indexes, value);
    }
    assignReference (name, value) {
        this.references.setReference(name, value);
    }
    _assignTypeInt(name, indexes, value, type) {
        const v = this.expressions.e2value(value);
        if (typeof v === 'number' || typeof v === 'bigint') {
            return this.references.set(name, indexes, v);
        }
        console.log(v);
        EXIT_HERE;
    }
    _assignTypeExpr(name, indexes, value, type) {
        const v = value.instance();
        return this.references.set(name, indexes, v);
    }
}
