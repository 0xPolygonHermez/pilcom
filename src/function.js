const util = require('util');
const {cloneDeep} = require('lodash');
const {assert, assertLog} = require('./assert.js');
const {FlowAbortCmd, BreakCmd, ContinueCmd, ReturnCmd} = require("./flow_cmd.js");
const Expression = require("./expression.js");
const ExpressionItems = require("./expression_items.js");
const List = require("./list.js");
const Context = require('./context.js');
module.exports = class Function {
    constructor (id, data = {}) {
        this.id = id;
        this.initialized = [data.args, data.returns, data.statements, data.funcname].some(x => typeof x !== 'undefined');
        this.name = data.funcname;
        if (data.args) {
            this.defineArguments(data.args);
        }
        this.returns = data.returns ?? []
        this.statements = data.statements ?? [];
    }
    setValue(value) {
        if (this.initialized) {
            throw new Error(`function it's initialized again`);
        }
        if (value instanceof Function === false) {
            throw new Error(`Invalid value to setValue of function`);
        }
        this.initialized = value.initialized;
        this.name = value.name;
        // TODO: clone return types
        this.args = {...value.args};
        this.returns = value.returns && Array.isArray(value.returns) ? [...value.returns] : value.returns;
        this.statements = value.statements;
    }
    defineArguments(args) {
        console.log(`#FCALL.DEFINE#${this.name}`, args.length);
        this.args = {};
        for (const arg of args) {
            const name = arg.name;
            if (name === '') throw new Error('Invalid argument name');
            if (name in this.args) throw new Error(`Duplicated argument ${name}`);
            this.args[name] = arg;
            // console.log(['function', this.name, name, arg]);
        }
    }
    // mapArgument was called before enter on function visibility scope because
    // inside function args "values" aren't visible.
    mapArguments(s) {
        console.log('##### MAP ARGUMENTS #######');
        // TODO: class o class-by-type to convert, cast, copy... between types

        /*
        for (const arg of s.args) {
            console.log(arg);
            if (arg.stack && arg.stack[0]) {
                console.log(arg.stack[0].operands);
            }
        }
        */
        let iarg = 0;
        let extraInfo = '';
        for (const name in this.args) {
            try {
                // console.log(`MAP-ARGUMENTS ${this.name} (arg[${iarg}]: ${name})`);
                const arg = this.args[name];
                // TODO: arrays and pol references ...
                let type = arg.type;
                const argDim = arg.dim ? arg.dim : 0;
                if (arg.reference) {
                    // console.log(`${this.name}.MAP-REFERENCE`);
                    const ref = s.args[iarg].getReference();

                    // special case of col, could be witness, fixed or im
                    if (type === 'col') {
                        type = Context.references.getReferenceType(ref.name);
                    }
                    const dim = ref.array ? ref.array.dim : 0;
                    if (dim !== argDim) {
                        console.log(type);
                        console.log(ref);
                        console.log(argDim);
                        console.log(s.args[iarg].getAloneOperand());
                        throw new Error(`Invalid array on ${Context.sourceRef}`);
                    }
                    Context.processor.declareReference(name, type, ref.array ? ref.array.lengths : []);
                    Context.references.setReference(name, ref);
                } else if (arg.type === 'int' || arg.type === 'fe') {
                    if (argDim) {
                        s.args[iarg].eval();
                        const ref = s.args[iarg].getReference();
                        console.log(ref);
                        console.log(ref.name);
                        const def = Context.references.getDefinition(ref.name);
                        const dup = def.array.applyIndex(def, ref.__indexes ?? []);

                        if (dup.array.dim !== argDim) {
                            console.log(dup.array.dim, argDim);
                            throw new Error(`Invalid array on ${Context.processor.sourceRef}`);
                        }

                        Context.processor.declareReference(name, type, dup.array ? dup.array.lengths: [], {});
                    } else {
                        console.log([name, iarg, s.args.length]);
                        const value = s.args[iarg].eval();
                        // TODO: review? no referece?
                        Context.processor.declareReference(name, type, value.array ? value.array.lengths: [], {}, value);
                    }
                } else {
                    // console.log(`MAP-${arg.type}`);
                    // TODO: type conversion, mapping in other class
                    console.log(s.args[iarg]);
                    if (s.args[iarg] instanceof ExpressionItems.ExpressionList) {
                        // check (argDim === 1 && arg.type === 'expr')
                        const list = new List(this, s.args[iarg], false);
                        const values = s.args[iarg].items;
                        Context.processor.declareReference(name, type, [values.length], {});
                        let index = 0;
                        for (const value of list.values) {
                            extraInfo = index;
                            console.log(value);
                            Context.references.set(name, [index++], value instanceof Expression ? value.instance() : value);
                        }
                    } else if (!(s.args[iarg] instanceof Expression)) {
                        console.log(arg);
                        console.log([this.name, iarg, s.args[iarg], s.args.length]);
                        EXIT_HERE;
                    } else {
                        // const value = s.args[iarg].instance().getAloneOperand();
                        // const value = s.args[iarg].getAloneOperand();
                        // const value = s.args[iarg].getReference();
                        const value = s.args[iarg].evaluateAloneReference();
                        const dim = value.array ? value.array.dim : 0;
                        if (dim !== argDim) {
                            throw new Error(`Invalid array on ${Context.sourceRef}`);
                        }
                        Context.processor.declareReference(name, type, value.array ? value.array.lengths: [], {}, value);
                    }
                }
                ++iarg;
            } catch (e) {
                console.log(`ERROR mapping parameter ${name} ${extraInfo} of function ${this.name} on ${Context.sourceRef}`);
                throw e;
            }
        }
        return false;
    }
    exec(s, mapInfo) {
        console.log(Context.constructor.name);
        let res = Context.processor.execute(this.statements, `FUNCTION ${this.name}`);
        if (res instanceof ReturnCmd) {
            Context.processor.traceLog('[TRACE-BROKE-RETURN]', '38;5;75;48;5;16');
            const resvalue = res.value.eval();
            return resvalue;
        }
        return res;
    }
}
