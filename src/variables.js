const {assert, assertLog} = require('./assert.js');
const Indexable = require("./indexable.js");

module.exports = class Variables extends Indexable {

    constructor (type, definitionClass, expressionItemClass, options) {
        super(type, definitionClass, expressionItemClass, options);
    }
}
