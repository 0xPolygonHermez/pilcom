const Function = require("../function.js");
module.exports = class Length extends Function {
    constructor (parent) {
        super(parent, {funcname: 'length'});
    }
    mapArguments(s) {
        if (s.arguments.length !== 1) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = s.arguments[0];
        if (arg0 && arg0.isReference()) {
            const [instance,rinfo] = this.expressions.getReferenceInfo(arg0);
            const operand = arg0.getAloneOperand();
            return rinfo.array ? BigInt(rinfo.array.getLength(operand.dim)) : 0n;
        }
        const value = this.expressions.e2value(s.arguments[0]);
        if (typeof value === 'string') {
            return BigInt(value.length);
        }
        return 0n;
    }
    exec(s, mapInfo) {
        return mapInfo;
    }
}
