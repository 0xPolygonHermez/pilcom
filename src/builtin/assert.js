const Function = require("../function.js");
const Context = require('../context.js');
const ExpressionItems = require('../expression_items.js')
module.exports = class Assert extends Function {
    constructor (parent) {
        super(parent, {funcname: 'assert'});
    }
    mapArguments(s) {
        console.log('############### ASSERT (prepare) ########################');
        console.log(s.args);
        if (s.args.length !== 1) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = s.args[0].asBool();
        console.log(arg0);
        if (!arg0) {
            throw new Error(`Assert fails ${arg0} on ${Context.sourceRef}`);
        }
        return new ExpressionItems.IntValue(0n);
    }
    exec(s, mapInfo) {
        console.log('############### ASSERT (exec) ########################');
        return mapInfo;
    }
}
