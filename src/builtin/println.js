const Function = require("../function.js");
module.exports = class Println extends Function {
    constructor (parent) {
        super(parent, {funcname: 'println', args: [], returns: [] });
    }
    mapArguments(s) {
        let texts = [];
        for (const arg of s.arguments) {
            if (typeof arg === 'string') {
                texts.push(arg);
                continue;
            }
            const value = this.expressions.e2value(arg);
            texts.push(value);
        }
        return texts;
    }
    exec(s, mapInfo) {
        /* let caller = '';
        try {
            throw new Error();
        } catch (e) {
            caller = e.stack.split('\n').slice(1).join('\n');
        }
        console.log(caller);*/
        console.log(`\x1B[1;35m[${s.debug}] ${mapInfo.join(' ')} (DEEP:${this.scope.deep})\x1B[0m`);
    }
}
