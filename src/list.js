const Context = require('./context.js');
const Router = require("./router.js");
const Expression = require("./expression.js");
const {ExpressionList} = require('./expression_items.js');
module.exports = class List {

    // TODO: Review compiler estructures
    // TODO: iterator of values without "extend"
    // TODO: check repetitive sequences (times must be same)

    constructor (parent, expression, reference = false) {
        this.parent = parent;
        this.padding = false;
        this.expression = expression;
        this.router = new Router(this, 'type', {defaultPrefix: '_extend'});
        this.reference = reference;
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
        if (e instanceof Expression) {
            return this._extendExpr(e);
        }
        if (e instanceof ExpressionList) {
            let res = [];
            for (const item of e.items) {
                res.push(this._resolve(item));
            }
            return res;
        }
        console.log(e);
        return this.router.go(e);
    }
    _extendAppend(e) {
        console.log(e);
        if (this.reference) {
            return this._extendAppendReferences(e);
        }
        return this._extendAppendValues(e);
    }
    _extendAppendValues(e) {
        console.log("=================  appendValues ==================");
        let values = [];
        console.log(e);
        const element = this._resolve(e.value);
        if (!element.dim && element.dim < 1) {
            throw new Error(`Could not extend and append a non array element`)
        }
        // TODO: non correct access from list class
        const count = element.lengths[0];
        let value = {...element}
        value.dim = value.dim - 1;
        value.lengths = value.lengths.slice(1);
        for(let index = 0; index < count; ++index) {
            // TODO: in proper way
            values.push({...value});
            ++value.value;
        }
        return values;
    }
    _extendAppendReferences(e) {
        console.log("=================  appendReferences ==================");
        let values = [];
        const info = Context.expressions.getReferenceInfo(e.value);
        let element = e.value.instance().getAloneOperand();
        if (!element.array || element.array.dim < 1) {
            throw new Error(`Could not extend and append a non array element`)
        }
        // TODO: operand class to do-it
        const count = element.array.lengths[0];
        let index = 0;
        while (index < count) {
            // TODO: with operand class, invalid clone?
            const ainfo = element.array.getIndexesTypedOffset([index]);
            let value = {...element, array: ainfo.array};
            value.id += ainfo.offset;

            values.push(value);
            ++index;
        }
        return values;
    }
    _extendExpr(e) {
        const num = this._resolve(e);
        return [num];
    }
    _resolve(e) {
        if (this.reference) {
            const expr = e.instance();
            return expr;
        }
        console.log(e);
        return e.eval();
        // return this.parent.resolveExpr(e.value);
    }
    _resolveArray(e) {
        if (!this.reference) {
            return this.parent.resolveExpr(e.value);
        }
        return e;
    }
}
