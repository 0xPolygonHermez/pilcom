const Function = require("../function.js");
module.exports = class Println extends Function {
    constructor (parent) {
        super(parent, {funcname: 'println', args: [], returns: [] });
    }
    mapArguments(s) {
        let texts = [];
        for (const arg of s.arguments) {
            texts.push(typeof arg === 'string' ? arg : this.expressions.e2value(arg));
        }
        return texts;
    }
    exec(s, mapInfo) {
        console.log(`\x1B[1;35m[${s.debug}] ${mapInfo.join(' ')} (DEEP:${this.scope.deep})\x1B[0m`);
    }
}
