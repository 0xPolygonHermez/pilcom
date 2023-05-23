const util = require('util');
const {cloneDeep} = require('lodash');

module.exports = class Function {

    constructor (parent, s) {
        this.parent = parent;
        this.name = s.funcname;
        this.defineArguments(s.args);
        this.returns = s.returns;
        this.statements = s.statements;
    }
    defineArguments(args) {
        this.args = {};
        for (const arg of args) {
            const name = arg.name;
            if (name === '') throw new Error('Invalid argument name');
            if (name in this.args) throw new Error(`Duplicated argument ${name}`);
            this.args[name] = arg;
        }
    }
    exec(s) {
        let iarg = 0;
        for (const name in this.args) {
            const arg = this.args[name];
            // TODO: arrays and pol references ...
            this.parent.declareReference(name, 'var', [], {type: arg.type}, this.parent.expressions.eval(s.arguments[iarg]));
            ++iarg;
        }
        let res = this.parent.execute(this.statements);
        return this.parent.expressions.eval(res.value);
    }
}
