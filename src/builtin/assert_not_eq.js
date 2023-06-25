const Function = require("../function.js");
module.exports = class AssertNotEq extends Function {
    constructor (parent) {
        super(parent, {funcname: 'assert_not_eq'});
    }
    mapArguments(s) {
        if (s.arguments.length !== 2) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = this.expressions.e2value(s.arguments[0]);
        const arg1 = this.expressions.e2value(s.arguments[1]);
        return arg0 === arg1 ? 0n:1n;
    }
    exec(s, mapInfo) {
        return mapInfo;
    }

}
