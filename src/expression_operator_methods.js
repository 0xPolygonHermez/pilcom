const util = require('util');
const {assert} = require("chai");
const ExpressionItem = require('./expression_items/expression_item.js');
module.exports = class ExpressionOperatorMethods {
    static operatorAddIntValue(valueA, valueB) {
        let res = valueA.clone();
        let expressionB = valueA.emptyClone();
        expressionB._set(valueB);
        res.insert('add', expressionB);
        res.simplify();
        return res;
    }
    static operatorAdd(valueA, valueB) {
        let res = valueA.clone();
        res.insert('add', valueB);
        res.simplify();
        return res;
    }
    static operatorEqIntValue(valueA, valueB) {
        let res = valueA.eval();
        return new ExpressionItem.IntValue(res.asInt() === valueB.asInt() ? 1n : 0n);
    }
}
