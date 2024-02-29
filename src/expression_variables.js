const {assert, assertLog} = require('./assert.js');
const Variables = require("./variables.js");
const ExpressionReference = require('./expression_items/expression_reference.js');

module.exports = class ExpressionVariables extends Variables {

    constructor (type, definitionClass, expressionItemClass, options) {
        super(type, definitionClass, expressionItemClass, options);
    }
    getConstItem(id, properties) {
        return new ExpressionReference(id, this.getItem(id, properties));
    }
}