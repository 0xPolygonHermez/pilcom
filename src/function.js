const util = require('util');
const {cloneDeep} = require('lodash');
const {FlowAbortCmd, BreakCmd, ContinueCmd, ReturnCmd} = require("./flow_cmd.js")
module.exports = class Function {

    constructor (parent, s) {
        this.parent = parent;
        this.references = parent.references;
        this.expressions = parent.expressions;
        this.scope = parent.scope;
        this.name = s.funcname;
        if (s.args) {
            this.defineArguments(s.args);
        }
        this.returns = s.returns ?? []
        this.statements = s.statements ?? [];
    }
    defineArguments(args) {
        this.args = {};
        for (const arg of args) {
            const name = arg.name;
            if (name === '') throw new Error('Invalid argument name');
            if (name in this.args) throw new Error(`Duplicated argument ${name}`);
            this.args[name] = arg;
            // console.log(['function', this.name, name, arg]);
        }
    }
    mapArguments(s) {
        // mapArgument was called before enter on function visibility scope because
        // inside function arguments "values" aren't visible.
        let iarg = 0;
        for (const name in this.args) {
            const arg = this.args[name];
            // TODO: arrays and pol references ...
            let type = arg.type;
            const argDim = arg.dim ? arg.dim : 0;
            if (arg.reference) {
                const ref = s.arguments[iarg].getReference();

                // special case of col, could be witness, fixed or im
                if (type === 'col') {
                    type = this.parent.references.getReferenceType(ref.name);
                }
                const dim = ref.array ? ref.array.dim : 0;
                if (dim !== argDim) {
                    throw new Error(`Invalid array on ${this.parent.sourceRef}`);
                }
                this.parent.declareReference(name, type, ref.array ? ref.array.lengths : []);
                this.parent.references.setReference(name, ref);
            } else {
                const value = this.parent.expressions.eval(s.arguments[iarg]);
                if (arg.type === 'col') {
                    type = value.type;
                }
                const dim = value.array ? value.array.dim : 0;
                if (dim !== argDim) {
                    throw new Error(`Invalid array on ${this.parent.sourceRef}`);
                }
                this.parent.declareReference(name, type, value.array ? value.array.lengths: [], {}, value);
            }
            ++iarg;
        }
        return false;
    }
    exec(s, mapInfo) {
        let res = this.parent.execute(this.statements, `FUNCTION ${this.name}`);
        if (res instanceof ReturnCmd) {
            this.parent.traceLog('[TRACE-BROKE-RETURN]', '38;5;75;48;5;16');
            const resvalue = res.value.eval();
            return resvalue;
        }
        return res;
    }
}
