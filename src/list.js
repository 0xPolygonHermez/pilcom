const Router = require("./router.js");

module.exports = class List {

    // TODO: Review compiler estructures
    // TODO: iterator of values without "extend"
    // TODO: check repetitive sequences (times must be same)

    constructor (parent, expression) {
        this.parent = parent;
        this.padding = false;
        this.expression = expression;
        this.router = new Router(this, 'type', {defaultPrefix: '_extend'});
        this.values = this.extend();
    }
    extend() {
        return this._extend(this.expression);
    }
    _extendExpressionList(e) {
        let values = [];
        for(const value of e.values) {
            values = [...values, ...this._extend(value)];
        }
        return values;
    }
    _extend(e) {
        return this.router.go(e);
    }
    _extendAppend(e) {
        let values = [];
        for(const value of e.values) {
            values = [...values, ...this._extend(value)];
        }
        return values;
    }
    _extendExpr(e) {
        console.log(e);
        const num = this.parent.getExprNumber(e);
        return [num];
    }
}
