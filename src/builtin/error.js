const Function = require("../function.js");
module.exports = class Error extends Function {
    constructor (parent) {
        super(parent, {funcname: 'error', args: [], returns: [] });
    }
    mapArguments(s) {
        let texts = [];
        for (const arg of s.args) {
            if (typeof arg === 'string') {
                texts.push(arg);
                continue;
            }

            const value = arg.toString();
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
        console.log(`\x1B[1;35m[${s.debug}] ERROR ${mapInfo.join(' ')}\x1B[0m`);
    }
}
