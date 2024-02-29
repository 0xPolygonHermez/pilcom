const Function = require("../function.js");
const IntValue = require('../expression_items/int_value.js');
module.exports = class Println extends Function {
    constructor (parent) {
        super(parent, {funcname: 'println', args: [], returns: [] });
    }
    mapArguments(s) {
        let texts = [];
        for (const arg of s.args) {
            if (typeof arg === 'string') {
                texts.push(arg);
                continue;
            }

            const value = arg.eval();
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
        console.log(`\x1B[1;35mPRINTLN ${mapInfo.join(' ')}\x1B[0m`);
        return new IntValue(0);
    }
}
