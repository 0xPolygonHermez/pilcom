const Function = require("../function.js");

module.exports = class IsArray extends Function {
    constructor (parent) {
        super(parent, {funcname: 'is_array'});
    }
    mapArguments(s) {
        if (s.arguments.length !== 1) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = s.arguments[0];
        if (arg0 && arg0.isReference()) {
            const ref = arg0.getReference();
            if (!this.references.isDefined(ref.name, ref.__indexes)) {
                return 0n;
            }
            const [instance,rinfo] = this.expressions.getReferenceInfo(arg0);
            const operand = arg0.getAloneOperand();
            return (rinfo.array && rinfo.array.dim > operand.dim) ? 1n:0n;
        }
        return 0n;
    }
    exec(s, mapInfo) {
        return mapInfo;
    }
}
