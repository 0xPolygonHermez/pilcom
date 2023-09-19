const util = require('util');
const RuntimeItem = require("./runtime_item.js");
const Context = require('../context.js');
module.exports = class FunctionCall extends RuntimeItem {
    constructor (name, args = [], indexes = [], debug = {}) {
        super(debug);
        this.name = name;
        this.args = args.map(x => (typeof x.clone === 'function') ? x.clone() : x);
        this.indexes = indexes.map(x => (typeof x.clone === 'function') ? x.clone() : x);
        console.log(`############## ARGS(${name},${this.args.length}) ######################`);
        console.log(util.inspect(args, false, 10, true));
    }
    setFunction(funcdef) {
        this.funcdef = funcdef;
    }
    dump(options) {
        const indexes = this.indexes.length > 0 ? '['+this.indexes.join(',')+']':'';
        const args = '(' + this.args.map(x => x.toString()).join(',') +')';
        return this.name + args + indexes;
    }
    clone() {
        let cloned = new FunctionCall(this.name, this.args, this.indexes);
        cloned.funcdef = this.funcdef;
    }
    eval(options) {
        const definition = Context.references.get(this.name, options);
        const res = Context.processor.executeFunctionCall(this.name, this);
        console.log(res);
        return res;
    }
}
