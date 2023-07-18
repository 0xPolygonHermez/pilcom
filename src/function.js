const util = require('util');
const {cloneDeep} = require('lodash');
const {FlowAbortCmd, BreakCmd, ContinueCmd, ReturnCmd} = require("./flow_cmd.js");
const Expression = require("./expression.js");
const List = require("./list.js");
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
        // TODO: class o class-by-type to convert, cast, copy... between types

        /*
        for (const arg of s.arguments) {
            console.log(arg);
            if (arg.stack && arg.stack[0]) {
                console.log(arg.stack[0].operands);
            }
        }
        */
        // mapArgument was called before enter on function visibility scope because
        // inside function arguments "values" aren't visible.
        let iarg = 0;
        for (const name in this.args) {
            // console.log(`MAP-ARGUMENTS ${this.name} (arg[${iarg}]: ${name})`);
            const arg = this.args[name];
            // TODO: arrays and pol references ...
            let type = arg.type;
            const argDim = arg.dim ? arg.dim : 0;
            if (arg.reference) {
                // console.log(`${this.name}.MAP-REFERENCE`);
                const ref = s.arguments[iarg].getReference();

                // special case of col, could be witness, fixed or im
                if (type === 'col') {
                    type = this.parent.references.getReferenceType(ref.name);
                }
                const dim = ref.array ? ref.array.dim : 0;
                if (dim !== argDim) {
                    console.log(type);
                    console.log(ref);
                    console.log(argDim);
                    console.log(s.arguments[iarg].getAloneOperand());
                    throw new Error(`Invalid array on ${this.parent.sourceRef}`);
                }
                this.parent.declareReference(name, type, ref.array ? ref.array.lengths : []);
                this.parent.references.setReference(name, ref);
            } else if (arg.type === 'int' || arg.type === 'fe') {
                if (argDim) {
                    s.arguments[iarg].eval();
                    const ref = s.arguments[iarg].getReference();
                    console.log(ref);
                    console.log(ref.name);
                    const def = this.references.getDefinition(ref.name);
                    const dup = def.array.applyIndex(def, ref.__indexes ?? []);

                    if (dup.array.dim !== argDim) {
                        console.log(dup.array.dim, argDim);
                        throw new Error(`Invalid array on ${this.parent.sourceRef}`);
                    }

                    this.parent.declareReference(name, type, dup.array ? dup.array.lengths: [], {});
                } else {
                    const value = this.parent.expressions.eval(s.arguments[iarg]);
                    // TODO: review? no referece?
                    this.parent.declareReference(name, type, value.array ? value.array.lengths: [], {}, value);
                }
            } else {
                // console.log(`MAP-${arg.type}`);
                // TODO: type conversion, mapping in other class
                if (s.arguments[iarg].type === 'expression_list') {
                    // check (argDim === 1 && arg.type === 'expr')
                    const list = new List(this, s.arguments[iarg], false);
                    const values = s.arguments[iarg].values;
                    this.parent.declareReference(name, type, [values.length], {});
                    let index = 0;
                    for (const value of list.values) {
                        // console.log(value);
                        this.parent.references.set(name, [index++], value instanceof Expression ? value.instance() : value);
                    }
                } else if (!(s.arguments[iarg] instanceof Expression)) {
                    console.log(arg);
                    console.log(s.arguments[iarg]);
                    EXIT_HERE;
                } else {
                    const value = s.arguments[iarg].instance().getAloneOperand();
                    const dim = value.array ? value.array.dim : 0;
                    if (dim !== argDim) {
                        throw new Error(`Invalid array on ${this.parent.sourceRef}`);
                    }
                    this.parent.declareReference(name, type, value.array ? value.array.lengths: [], {}, value);
                }
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
