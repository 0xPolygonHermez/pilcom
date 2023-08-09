const util = require('util');
const {cloneDeep} = require('lodash');
const Expression = require("./expression.js");
const {ReferenceItem, IntValue} = require("./expression_items.js");
const Router = require("./router.js");
const {assert, assertLog} = require('./assert');
module.exports = class ExpressionFactory {

    // pre function to delete property op only used by routing
    static router = new Router(this, 'op', {defaultPrefix: 'from', pre: (method, obj) => delete obj.op});

    static fromObject(obj) {
        if (obj instanceof Expression) {
            return obj;
        }
        console.log(obj);
        assert(typeof obj === 'object');
        assert(obj.type == 'expr');
        obj = {...obj};
        delete obj.type;

        assert(obj.op !== 'object' && obj.op !== 'objects');
        if (obj.dim === 0) delete obj.dim;
        if (obj.next === 0 || obj.next === false) delete obj.next;

        let item = ExpressionFactory.router.go(obj);

        let unknownProperties = [];
        for (const prop in obj) {
            if (prop.startsWith('__')) continue;
            if (prop === 'debug') continue;
            unknownProperties.push(prop);
        }

        if (unknownProperties.length > 0) {
            console.log(obj);
            throw new Error(`Invalid properties: ${unknownProperties.join(',')} on ${obj.debug}`);
        }
        let expr = new Expression();
        expr._set(item);
        return expr;
    }
    static fromObjects(objs) {
        let expressions = [];
        for (const obj of objects) {
            expressions.push(ExpressionFactory.fromObject(obj));
        }
        return expressions;
    }
    static fromReference(obj) {
        let res = new ReferenceItem(obj.name, obj.indexes ?? [], (obj.next ?? 0) - (obj.prior ?? 0));
        delete obj.name;
        delete obj.indexes;
        delete obj.dim;
        delete obj.next;
        delete obj.prior;
        return res;
    }
    static fromNumber(obj) {
        let res = new IntValue(obj.value);
        delete obj.value;
        return res;
    }
    static fromCall(obj) {
        let res = new FunctionCall(obj.name, obj.arguments ?? [], obj.indexes ?? []);
        delete obj.name;
        delete obj.indexes;
        delete obj.dim;
        delete obj.arguments;
        return res;
    }
    // TODO: positionalParams
}
