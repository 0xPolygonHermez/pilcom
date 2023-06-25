const Function = require("../function.js");
module.exports = class Assert extends Function {
    constructor (parent) {
        super(parent, {funcname: 'assert'});
    }
    mapArguments(s) {
        if (s.arguments.length !== 1) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = this.expressions.e2bool(s.arguments[0]);
        if (!arg0) {
            throw new Error(`Assert fails ${arg0} on ${this.parent.sourceRef}`);
        }
        return 0n;
    }
    exec(s, mapInfo) {
        return mapInfo;
    }
}
