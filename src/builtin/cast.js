const Function = require("../function.js");
const Context = require('../context.js');
const Expression = require('../expression.js');

module.exports = class Cast extends Function {
    constructor (parent) {
        super(parent, {funcname: 'cast'});
    }
    mapArguments(s) {
        console.log('############### CAST (prepare) ########################');
        console.log(s.args);
        if (s.args.length !== 2) {
            throw new Error('Invalid number of parameters');
        }
        if (typeof s.args[0] !== 'string') {
            throw new Error('Invalid type of cast');
        }
        const cast = s.args[0];
        let arg1 = s.args[1] instanceof Expression ? s.args[1].eval() : s.args[1];
        console.log(arg1, arg1.isBaseType, typeof arg1.asStringItem);
        if (arg1 instanceof Expression) {
            arg1.dump();
            arg1 = arg1.eval();
        }
        switch (cast) {
            case 'string':
                if (arg1.isBaseType && typeof arg1.asStringItem === 'function') {
                    return arg1.asStringItem();
                }
        }
        EXIT_HERE;
    }
    exec(s, mapInfo) {
        console.log('############### CAST (exec) ########################', mapInfo);
        return mapInfo;
    }
}
