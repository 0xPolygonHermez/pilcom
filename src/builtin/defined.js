const Function = require("../function.js");
const MultiArray = require("../multi_array.js");
const {IntValue} = require('../expression_items.js');
const Exceptions = require('../exceptions.js');

module.exports = class Defined extends Function {
    constructor (parent) {
        super(parent, {funcname: 'defined'});
    }
    mapArguments(s) {
        if (s.args.length !== 1) {
            throw new Error('Invalid number of parameters');
        }
        const arg0 = s.args[0];
        let value = false;
        try {
            if (arg0) {
                value = arg0.eval();
            }
            // if (arg0 && arg0.isReference()) {
            //     const ref = arg0.getReference();
            //     return this.references.isDefined(ref.name, ref.__indexes) ? 1n : 0n;
            // }
        } catch (e) {
            if (e instanceof Exceptions.ReferenceNotFound || e instanceof Exceptions.ReferenceNotVisible) {
                console.log(`defined(${arg0.toString()}) EXCEPTION `, e.message);
            } else {
                throw e;
            }
        }
        const res = new IntValue(value !== false ? 1n : 0n);
        return res;
    }
    exec(s, mapInfo) {
        return mapInfo;
    }
}
