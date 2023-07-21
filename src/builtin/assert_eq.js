const Function = require("../function.js");
module.exports = class AssertEq extends Function {
    constructor (parent) {
        super(parent, {funcname: 'assert_eq'});
    }
    mapArguments(s) {
        if (s.arguments.length !== 2) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = this.expressions.e2value(s.arguments[0]);
        const arg1 = this.expressions.e2value(s.arguments[1]);
        if (arg0 !== arg1) {
            throw new Error(`Assert fails (${arg0} === ${arg1}) on ${this.parent.sourceRef}`);
        }
        return 0n;
    }
    exec(s, mapInfo) {
        return mapInfo;
    }
}
