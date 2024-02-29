const Function = require("../function.js");
const Expression = require('../expression.js');
const Context = require('../context.js');
const IntValue = require('../expression_items/int_value.js');
const {assert, assertLog} = require('../assert.js');
module.exports = class AssertEq extends Function {
    constructor () {
        super(999999, {funcname: 'assert_eq'});
    }
    mapArguments(s) {
        if (s.args.length !== 2) {
            throw new Error('Invalid number of parameters');
        }
        assert(s.args[0] instanceof Expression);
        assert(s.args[1] instanceof Expression);
        const arg0 = s.args[0].eval();
        const arg1 = s.args[1].eval();
        console.log(arg0);
        console.log(arg1);
        if (!arg0.equals(arg1)) {
            throw new Error(`Assert fails (${arg0} === ${arg1}) on ${Context.sourceRef}`);
        }
        return 0n;
    }
    exec(s, mapInfo) {
        return new IntValue(mapInfo);
    }
}
