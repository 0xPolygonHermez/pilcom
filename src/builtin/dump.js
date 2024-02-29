const Function = require("../function.js");
const Context = require('../context.js');
const ExpressionItems = require('../expression_items.js')
module.exports = class Dump extends Function {
    constructor (parent) {
        super(parent, {funcname: 'dump'});
    }
    mapArguments(s) {
        if (s.args.length !== 1) {
            throw new Error('Invalid number of parameters');
        }
        return s.args[0].eval();
    }
    exec(s, mapInfo) {
        mapInfo.dump();
        return new ExpressionItems.IntValue(0n);
    }
}
