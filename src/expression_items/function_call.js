const util = require('util');
const RuntimeItem = require("./runtime_item.js");
const ExpressionList = require("./expression_list.js");
const Context = require('../context.js');
const Debug = require('../debug.js');
const ExpressionClass = require('../expression_class.js');
module.exports = class FunctionCall extends RuntimeItem {    
    constructor (name, args = [], indexes = [], options = {}) {
        super(options);
        this.name = name;
        if (args instanceof ExpressionList) {
            if (Debug.active) console.log(util.inspect(args, false, 10, true));
            args = args.items;
        }
        if (Debug.active) console.log(`#FCALL#${name} ${Context.sourceTag} ${args.length}`+ 
                                      util.inspect(args, false, null));
        // this.args = args.map(x => (typeof x.clone === 'function') ? x.clone() : x);
        this.args = args.map(x => x.clone());
        this.indexes = indexes.map(x => (typeof x.clone === 'function') ? x.clone() : x);
        if (Debug.active) {
            console.log(`############## ARGS(${name},${this.args.length}) ######################`);
            console.log(util.inspect(args, false, 10, true));
            this.dumpArgs(this.args, 'FCALL');
        }
    
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
    dumpArgs (args, label = '') {
        args.forEach((x, index) => {
            const _label = `${label}[${index}]`;
            if (ExpressionClass.isInstance(x)) x.dump(_label); 
            else if (x instanceof ExpressionList) this.dumpArgs(x.items, _label);
            else console.log(_label, x);
        });
    }
    evalInside(options = {}) {
        if (Debug.active) {
            console.log([`#FCALL.EVAL #${this.name} ${Context.sourceTag}`, this.args]);
            this.dumpArgs(this.args, `CALL ${this.name}`);
        }
        const definition = Context.references.get(this.name, options);
        const res = Context.processor.executeFunctionCall(this.name, this);
        if (Debug.active) console.log(this.name, res);
        return res;
    }
}
