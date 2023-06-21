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
            let type = arg.type;
            if (arg.reference) {
                const ref = s.arguments[iarg].getReference();

                // special case of col, could be witness, fixed or im
                if (type === 'col') {
                    type = this.parent.references.getReferenceType(ref.name);
                }
                this.parent.declareReference(name, type, []);
                this.parent.references.setReference(name, ref);
            } else {
                const value = this.parent.expressions.eval(s.arguments[iarg]);
                if (arg.type === 'col') {
                    type = value.type;
                }
                this.parent.declareReference(name, type, [], {}, value);
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
