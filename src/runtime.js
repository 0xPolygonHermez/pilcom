const util = require('util');
const Expression = require('./expression.js');
const NonRuntimeEvaluable = require('./non_runtime_evaluable.js');
const {assert, assertLog} = require('./assert.js');
const {Reference, StackItem, ExpressionItem, ValueItem, IntValue, ProofItem} = require("./expression_items.js");

module.exports = class Runtime {

    constructor (context) {
        context.runtime = this;
        this.context = context;
    }

    eval(operand, options) {

        if (operand instanceof Reference) {
            return this.resolveReference(operand, options);
        }
        EXIT_HERE;
        // TODO: if not runtime evaluable return null or
        const op = operand.op;
        switch (op) {
            case 'string': return this.evalString(operand);
            case 'number': return this.evalNumber(operand);
            case 'call': return this.evalCall(operand);
            case 'idref': return this.evalIdref(operand);
//            case 'reference': return this.evalReference(operand, expr, options);
            case 'reference': return this.resolveReference(operand, options);
        }
        throw new Error(`Invalid runtime operation ${op}`);
    }
    resolveReference(operand, options) {
        const names = this.context.getNames(operand.name);

        let getTypeValueOptions = {};
        if (operand.inc === 'pre') {
            getTypeValueOptions.preDelta = 1n;
        }
        if (operand.inc === 'post') {
            getTypeValueOptions.postDelta = 1n;
        }
        if (operand.dec === 'pre') {
            getTypeValueOptions.preDelta = -1n;

        }
        if (operand.dec === 'post') {
            getTypeValueOptions.postDelta = -1n;
        }
        console.log(names, operand.__indexes ?? [], options);
        let res = this.context.references.getTypedValue(names, operand.__indexes ?? [], options);
        if (typeof operand.__next !== 'undefined') {
            res.__next = res.next = operand.__next;
        } else if (typeof operand.next !== 'number' && (operand.next || operand.prior)) {
            console.log(operand);
            throw new Error(`INTERNAL: next and prior must be previouly evaluated`);
        } else if (typeof operand.next === 'number' && operand.next) {
            res.next = operand.next;
        }
        console.log(res);
        return res;
    }
}
