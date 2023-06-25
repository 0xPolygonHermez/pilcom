const Function = require("../function.js");
const {MultiArray, ErrorIndexOutOfRange} = require("../multi_array.js");

module.exports = class Defined extends Function {
    constructor (parent) {
        super(parent, {funcname: 'defined'});
    }
    mapArguments(s) {
        if (s.arguments.length !== 1) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = s.arguments[0];
        if (arg0 && arg0.isReference()) {
            const ref = arg0.getReference();
            return this.references.isDefined(ref.name, ref.__indexes) ? 1n : 0n;
        }
        return 0n;
    }
    exec(s, mapInfo) {
        return mapInfo;
    }
}
