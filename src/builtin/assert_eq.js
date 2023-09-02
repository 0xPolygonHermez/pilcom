const Function = require("../function.js");
const Expression = require('../expression.js');
module.exports = class AssertEq extends Function {
    constructor () {
        super(999999, {funcname: 'assert_eq'});
    }
    mapArguments(s) {
        if (s.arguments.length !== 2) {
            throw new Error('Invalid number of parameters');
        }
        assert(s.arguments[0] instanceof Expression);
        assert(s.arguments[1] instanceof Expression);
        const arg0 = s.arguments[0].e2value();
        const arg1 = s.arguments[1].e2value();
        if (arg0 !== arg1) {
            throw new Error(`Assert fails (${arg0} === ${arg1}) on ${Context.sourceRef}`);
        }
        return 0n;
    }
    exec(s, mapInfo) {
        return mapInfo;
    }
}
