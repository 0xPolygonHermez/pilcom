const Function = require("../function.js");
const IntValue = require('../expression_items/int_value.js');

module.exports = class AssertNotEq extends Function {
    constructor (parent) {
        super(parent, {funcname: 'assert_not_eq'});
    }
    mapArguments(s) {
        if (s.args.length !== 2) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = this.expressions.e2value(s.args[0]);
        const arg1 = this.expressions.e2value(s.args[1]);
        if (arg0 === arg1) {
            throw new Error(`Assert fails (${arg0} !== ${arg1}) on ${this.parent.sourceRef}`);
        }
        return 0n;
    }
    exec(s, mapInfo) {
        return new IntValue(mapInfo);
    }

}
