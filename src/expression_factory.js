const util = require('util');
const {cloneDeep} = require('lodash');
const Expression = require("./expression.js");
const {ReferenceItem, IntValue, StringValue,
    FunctionCall} = require("./expression_items.js");
const Router = require("./router.js");
const {assert, assertLog} = require('./assert');
module.exports = class ExpressionFactory {

    // pre function to delete property op only used by routing
    static router = new Router(this, 'type', {defaultPrefix: 'from', pre: (method, obj) => delete obj.type});

    static fromObject(obj) {
        if (obj instanceof Expression) {
            return obj;
        }
        console.log(obj);
        assertLog(typeof obj === 'object', obj);
        assertLog(typeof obj.op === 'undefined', obj);
        obj = {...obj};

        assert(obj.type !== 'object' && obj.type !== 'objects');
        if (obj.dim === 0) delete obj.dim;
        if (obj.next === 0 || obj.next === false) delete obj.next;

        console.log(obj);
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
    static fromString(obj) {
        let res = new StringValue(obj.value);
        delete obj.value;
        return res;
    }
    static fromCall(obj) {
        console.log('CALL');
        console.log(util.inspect(obj, false, 10, true));
        let res = new FunctionCall(obj.function.name, obj.args ?? [], obj.indexes ?? [], {
            name: obj.function.name.debug});
        console.log(res);
        delete obj.function;
        delete obj.indexes;
        delete obj.dim;
        delete obj.args;
        return res;
    }
    static fromCast(obj) {
        let res = new FunctionCall('cast', [obj.cast, obj.value], []);
        delete obj.name;
        delete obj.cast;
        delete obj.value;
        console.log(res);
        return res;
    }
    // TODO: positionalParams
}