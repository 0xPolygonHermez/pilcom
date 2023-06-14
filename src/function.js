const util = require('util');
const {cloneDeep} = require('lodash');
const {FlowAbortCmd, BreakCmd, ContinueCmd, ReturnCmd} = require("./flow_cmd.js")
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
            if (arg.reference) {
                this.parent.declareReference(name, 'int', []);
                this.parent.references.setReference(name, s.arguments[iarg].expr.getReference());
            } else {
                this.parent.declareReference(name, 'int', [], {}, this.parent.expressions.eval(s.arguments[iarg]));
            }
            ++iarg;
        }
        let res = this.parent.execute(this.statements, `FUNCTION ${this.name}`);
        if (res instanceof ReturnCmd) {
            this.parent.traceLog('[TRACE-BROKE-RETURN]', '38;5;75;48;5;16');
            const resvalue = res.value.eval();
            return resvalue;
        }
        return res;
    }
}
