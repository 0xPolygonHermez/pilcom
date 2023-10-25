const util = require('util');
const RuntimeItem = require("./runtime_item.js");
const ExpressionList = require("./expression_list.js");
const Context = require('../context.js');
module.exports = class FunctionCall extends RuntimeItem {
    constructor (name, args = [], indexes = [], debug = {}) {
        super(debug);
        this.name = name;
        if (args instanceof ExpressionList) {
            console.log(util.inspect(args, false, 10, true));
            args = args.items;
        }
        console.log([`#FCALL#${name} ${Context.sourceTag} ${args.length}`, args]);
        // this.args = args.map(x => (typeof x.clone === 'function') ? x.clone() : x);
        this.args = args.map(x => x.clone());
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
    cloneInstance() {
        return new FunctionCall(this.name, this.args, this.indexes);
    }
    cloneUpdate(source) {
        super.cloneUpdate(source);
        this.funcdef = source.funcdef;
    }
    evalInside(options) {
        console.log([`#F CALL.EVAL #${this.name} ${Context.sourceTag}`, this.args]);
        if (Context.sourceTag === 'basic_functions.pil:12') debugger;
        const definition = Context.references.get(this.name, options);
        const res = Context.processor.executeFunctionCall(this.name, this);
        console.log(res);
        return res;
    }
}
