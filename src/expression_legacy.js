const util = require('util');
const {cloneDeep} = require('lodash');
const {assert} = require("chai");
const NonRuntimeEvaluable = require('./non_runtime_evaluable.js');
const PilItem = require('./pil_item.js');

const OP_VALUE = 0;
const OP_ID_REF = 1;
const OP_STACK = 2;
const OP_RUNTIME = 3;
const NATIVE_REFS = ['witness', 'fixed', 'public', 'challenge', 'subproofvalue', 'proofvalue', 'publictable'];
const NATIVE_OPS = ['add', 'sub', 'mul', 'neg'];
const VALID_NATIVE_OPS = [false, ...NATIVE_OPS];

class ExpressionStackEvaluating {};
class InstanceArray extends Error {};
module.exports = class Expression {

    // op (string)
    // operands (array)

    // op_type --> (OP_CONST, OP_NAME_REF, OP_ID_REF, OP_STACK)
    // name (string)
    // indexes (array) --> be carrefull with clone
    // value (bingint)
    // offset (number)

    static parent;
    // TODO: add all operations as if,
    static operations = {
        mul:  { type: 'arith',   label: '*',  prec:  96, args: 2, handle: (a, b) => a * b,  handleFr: (Fr, a, b) => Fr.mul(a, b)},
        add:  { type: 'arith',   label: '+',  prec:  10, args: 2, handle: (a, b) => a + b,  handleFr: (Fr, a, b) => Fr.add(a, b)},
        sub:  { type: 'arith',   label: '-',  prec:  11, args: 2, handle: (a, b) => a - b,  handleFr: (Fr, a, b) => Fr.sub(a, b)},
        pow:  { type: 'arith',   label: '**', prec:  98, args: 2, handle: (a, b) => a ** b, handleFr: (Fr, a, b) => Fr.pow(a, b)},
        neg:  { type: 'arith',   label: '-',  prec: 102, args: 1, handle: (a) => -a,        handleFr: (Fr, a) => Fr.neg(a, b)},
        div:  { type: 'arith',   label: '/',  prec:  94, args: 2, handle: (a, b) => a / b},
        mod:  { type: 'arith',   label: '%',  prec:  92, args: 1, handle: (a, b) => a % b},
        gt:   { type: 'cmp',     label: '>',  prec:  76, args: 2, handle: (a, b) => (a > b  ? 1n : 0n)},
        ge:   { type: 'cmp',     label: '>=', prec:  72, args: 2, handle: (a, b) => (a >= b ? 1n : 0n)},
        lt:   { type: 'cmp',     label: '<',  prec:  78, args: 2, handle: (a, b) => (a < b  ? 1n : 0n)},
        le:   { type: 'cmp',     label: '<=', prec:  74, args: 2, handle: (a, b) => (a <= b ? 1n : 0n)},
        eq:   { type: 'cmp',     label: '==', prec:  66, args: 2, handle: (a, b) => (a == b ? 1n : 0n)},
        ne:   { type: 'cmp',     label: '!=', prec:  64, args: 2, handle: (a, b) => (a != b ? 1n : 0n)},
        and:  { type: 'logical', label: '&&', prec:  46, args: 2, handle: (a, b) => (a && b ? 1n : 0n)},
        or:   { type: 'logical', label: '||', prec:  44, args: 2, handle: (a, b) => (a || b ? 1n : 0n)},
        shl:  { type: 'bit',     label: '<<', prec:  86, args: 2, handle: (a, b) => (a << b ? 1n : 0n)},
        shr:  { type: 'bit',     label: '>>', prec:  84, args: 2, handle: (a, b) => (a >> b ? 1n : 0n)},
        band: { type: 'bit',     label: '&',  prec:  58, args: 2, handle: (a, b) => (a & b  ? 1n : 0n)},
        bor:  { type: 'bit',     label: '|',  prec:  56, args: 2, handle: (a, b) => (a | b  ? 1n : 0n)},
        bxor: { type: 'bit',     label: '^',  prec:  54, args: 2, handle: (a, b) => (a ^ b  ? 1n : 0n)},
        not:  { type: 'logical', label: '!',  prec: 100, args: 1, handle: (a) => (a ? 0n : 1n)},
    }

    constructor () {
        this.stack = [];
        this.fixedRowAccess = false;
    }

    static setParent (parent) {
        Expression.parent = parent;
    }

    clone() {
        let cloned = new Expression();
        cloned.fixedRowAccess = this.fixedRowAccess;
        cloned.pushStack(this);
        return cloned;
    }

    pushStack(e) {
        if (!(e instanceof Expression)) {
            throw new Error(`pushStack parameter must be an Expression`);
        }
        const count = e.stack.length;
        for (let index = 0; index < count; ++index) {
            this.stack.push(this.cloneDeep(e.stack[index], 'pushStack'));
        }
        return count;
    }

    cloneDeep(e, label = '') {
        const res = cloneDeep(e);
        return res;
    }

    next(dnext) {
        for (let stack of this.stack) {
            for (let ope of stack.operands) {
                switch (ope.type) {
                    case OP_VALUE:
                    case OP_STACK:
                        break;
                    case OP_ID_REF:
                        const pnext = Number(ope.next);
                        ope.next = ope.next ? pnext + Number(dnext) : Number(dnext);
                        break;
                    case OP_RUNTIME:
                        throw new Error(`Instance first do next operation`);
                }
            }
        }
    }
    insertStack(e, pos) {
        const delta = e.stack.length;
        for (let index = pos; index < this.stack.length; ++index) {
            for (const ope of this.stack[index].operands) {
                if (ope.type === OP_STACK && (index - ope.offset) < pos) {
                    ope.offset += delta;
                }
            }
        }
        for (let index = this.stack.length - 1; index >= pos; --index) {
            this.stack[index + delta] = this.stack[index];
        }
        for (let index = 0; index < delta; ++index) {
            this.stack[index + pos] = this.cloneDeep(e.stack[index]);
        }
        this.fixedRowAccess = this.fixedRowAccess || e.fixedRowAccess;
        return 1;
    }
    cloneOperand(operator) {
        return cloneDeep(operator);
    }

    cloneAlone() {
        return this.cloneOperand(this.stack[0].operands[0]);
    }

    isAlone () {
        return this.stack.length === 1 && this.stack[0].op === false;
    }
    pushAloneIndex(index) {
        assert(this.isAlone());
        let operand = this.getAloneOperand();
        if (typeof operand.indexes === 'undefined') {
            operand.indexes = [];
            operand.__indexes = [];
            operand.dim = 0;
        }
        operand.indexes.push(index);
        operand.__indexes.push(index);
        ++operand.dim;
    }
    popAloneIndex() {
        assert(this.isAlone());
        let operand = this.getAloneOperand();
        --operand.dim;
        operand.indexes.pop();
        return operand.__indexes.pop();
    }
    getAloneOperand () {
        return this.stack[0].operands[0];
    }
    cloneAloneOperand () {
        return cloneDeep(this.getAloneOperand());
    }

    isReference () {
        // TODO: review if best place?
        // TODO: review if next/prior
        return (this.isAlone() && this.stack[0].operands[0].type === OP_RUNTIME && this.stack[0].operands[0].op === 'reference' );
    }

    // OP_VALUE (value)
    // OP_ID_REF (id, refType, next)  refType = [im,witness,fixed,prover,public,((expression))]  At end need to calculate next of expression
    // OP_STACK (offset) NOTE: absolute_index = current_index - offset;
    // OP_RUNTIME (data)

    _set (operand) {
        if (this.stack.length) {
            throw new Error(`Set only could be used with empty stack`);
        }
        this.stack.push({op: false, operands: [cloneDeep(operand)]});
    }

    setIdReference (id, refType, next) {
        assert(typeof refType === 'string');
        this._set({type: OP_ID_REF, id, refType, next});
    }

    setValue (value) {
        if (typeof value === 'object') {
            throw new Error(`object(${value.constructor.name}) as value not allowed`);
        }
        this._set({type: OP_VALUE, value});
    }

    setRuntime (value) {
        if (value.type) {
            throw new Error(`setRuntime value has a not allowed type property`);
        }
        this._set({type: OP_RUNTIME, ...value});
    }

    isRuntime () {
        return this.stack.some(st => this.isRuntimeStackPos(st));
    }
    isRuntimeStackPos(st) {
        return ((st.op !== false &&  NATIVE_OPS.indexOf(st.op) < 0) || st.operands.some(ope => this.isRuntimeOperand(ope)));
    }
    isRuntimeOperand(ope) {
        return (ope.type === OP_RUNTIME);
    }
    insertOne (op, b) {
        const aIsEmpty = this.stack.length === 0;
        const bIsEmpty = b.stack.length === 0;

        if (bIsEmpty) {
            throw new Error(`insert without operands`);
        }
        const aIsAlone = this.isAlone();
        const bIsAlone = b.isAlone();
        if (bIsAlone) {    // aIsAlone => !aIsEmpty
            if (aIsAlone) {
                this.stack[0].op = op;
                this.stack[0].operands.push(b.cloneAlone());
                return this;
            }
            let operandA = aIsEmpty ? [] : [{type: OP_STACK, offset: 1}];
            this.stack.push({op, operands: [...operandA, b.cloneAlone()]});
            return this;
        }

        // !aIsAlone (aIsEmpty?) && !bIsAlone
        const count = this.pushStack(b);
        if (aIsEmpty) {
            this.stack.push({op, operands: [{type: OP_STACK, offset: 1}]});
            return this;
        }
        this.stack.push({op, operands: [{type: OP_STACK, offset: count + 1}, {type: OP_STACK, offset: 1}]});
        return this;
    }

    insert (op, ...bs) {
        if (bs.length === 1) {
            return this.insertOne(op, bs[0]);
        }
        const anyEmptyB = bs.some((b) => b.stack.length === 0);
        const aIsEmpty = this.stack.length === 0;

        // this.runtime = this.runtime || NATIVE_OPS.indexOf(op) < 0 || bs.some((b) => b.runtime);

        if (anyEmptyB) {
            throw new Error(`insert without operands`);
        }
        const aIsAlone = this.isAlone();
        const allBsAreAlone = bs.reduce((res, b) => res && b.isAlone(), true);

        let elem = {op, operands: []};
        if (aIsAlone && allBsAreAlone) {
            this.stack[0].op = op;
            for (const b of bs) {
                this.stack[0].operands.push(b.cloneAlone());
            }
            return this;
        }

        let counts = [];
        for (const b of bs) {
            counts.push(b.isAlone() ? 0 : this.pushStack(b));
        }
        counts.push(1);
        for (let index = counts.length - 2; index >= 0; --index) {
            counts[index] += counts[index + 1];
        }

        if (!aIsEmpty) {
            elem = {op, operands: [{type: OP_STACK, offset: counts[0]}]};
        }
        let index = 0;
        for (const b of bs) {
            elem.operands.push(b.isAlone() ? b.cloneAlone() : {type: OP_STACK, offset: counts[++index]});
        }
        this.stack.push(elem);
        return this;
    }
    evaluateAloneReference() {
        assert(this.isAlone());
        let operand = this.getAloneOperand();
        if (operand.type === OP_RUNTIME || operand.op === 'reference') {
            const res = this.evaluateRuntime(operand, true);
            if (!(res instanceof Expression)) {
                operand.__value = res;
            }
        }
        return operand.__value;
    }
    evaluateOperandValue(ope, pos, deeply, instance = false) {
        console.log(deeply);
        console.log(ope);

        if (deeply) {
            if (ope.type === OP_STACK) {
                const stackPos = pos-ope.offset;
                this.evaluateStackPosValue(stackPos);       // TODO: cache and infinite-loops
                ope.__value = this.stack[stackPos].__value;
            }
        } else if (ope.type === OP_VALUE ) {
            ope.__value = ope.value;

        } else if (ope.type === OP_ID_REF ) {
            ope.__value = new NonRuntimeEvaluable();

        } else if (ope.type === OP_RUNTIME ) {
            let res = this.evaluateRuntime(ope, deeply);
            console.log(res);
            console.log(instance);
            // BUG: if type was an expression not apply value !!
            // if (!(res instanceof Expression)) {
            if (instance) {
                console.log(res);
                if (res instanceof Expression && res.isAlone()) {
                    res = res.getAloneOperand();
                }
                console.log(res);
                if (res instanceof Expression) {
                    res.dump();
                    console.log(ope);
                    ope.__value = res;
                } else {
                    assert(!(res instanceof Expression));
                    Object.keys(ope).forEach(key => delete ope[key]);
                    if (typeof res === 'bigint') {
                        ope.type = OP_VALUE;
                        ope.value = res;
                        delete ope.op;
                    } else {
                        if (res.value) {
                            res = res.value;
                        }
                        if (res.refType) {
                            console.log(res);
        //                    assert(NATIVE_REFS.includes(res.type));
                            assert(NATIVE_REFS.includes(res.refType));
                            ope.type = OP_ID_REF;
                            ope.refType = res.refType;
                            ope.id = res.id;
                            if (res.next) ope.next = res.next;
                            assert(typeof ope.id === 'number');
                            delete ope.op;
                        } else if (res.array) {
                            throw new InstanceArray();
                        } else {
                            console.log(res);
                            EXIT_HERE;
                        }
                    }
                }
            } else {
                ope.__value = res;
            }
        }
    }
    assertInstanced() {
        try {
            for (let ist = 0; ist < this.stack.length; ++ist) {
                const st = this.stack[ist];
                assert(VALID_NATIVE_OPS.includes(st.op), `invalid operation ${st.op} on stackpos ${ist}`);
                for (let iope = 0; iope < st.operands.length; ++iope) {
                    const ope = st.operands[iope];
                    const ref = `operand #${iope} of stackpos ${ist}`;
                    assert([OP_STACK, OP_VALUE, OP_ID_REF].includes(ope.type), `${ref} has invalid type ${ope.type}`);
                    switch (ope.type) {
                        case OP_STACK:
                            assert(typeof ope.offset === 'number', `invalid offset type (${typeof ope.offset}) on ${ref}`);
                            assert(ope.offset > 0, `invalid offset value (${ope.offset}) on ${ref}`);
                            break;

                        case OP_VALUE:
                            assert(typeof ope.value === 'bigint', `invalid value type (${typeof ope.offset}) on ${ref}`);
                            break;

                        case OP_ID_REF:
                            assert(NATIVE_REFS.includes(ope.refType), `invalid refType (${ope.refType}) on ${ref}`)
                            assert(typeof ope.id === 'number', `invalid ope.id type (${typeof ope.id}) on ${ref}`);
                            break;

                    }
                    if (ope.indexes) {
                        const indexesType = typeof ope.indexes;
                        assert(indexesType === 'array', `${ref} has invalid indexes type ${indexesType}`);
                        for (let index = 0; index < ope.indexes.length; ++index) {
                            const indexType = typeof ope.indexes[index];
                            assert(indexType === 'number',  `${ref} has invalid index[${index}] type ${indexType}`);
                        }
                    }
                }
            }
        } catch (e) {
            this.dump();
            throw e;
        }
    }
    evaluateRuntime(op, deeply = false) {
        let res = Expression.parent.evalRuntime(op, this, deeply);
        return res;
    }
    instanceValues() {
        for (let se of this.stack) {
            for (let index = 0; index < se.operands.length; ++index) {
                if (se.operands[index].type !== OP_RUNTIME) continue;
                const value = se.operands[index].__value;
                if (typeof value === 'bigint') {
                    se.operands[index] = {type: OP_VALUE, value: value};
                    continue;
                }
                if (typeof value === 'object' && value.type &&
                    ['constant','witness', 'fixed', 'im', 'public', 'expr', 'challenge','subproofvalue', 'proofvalue'].includes(value.type)) {
                    let ope = {};
                    if (value.array) {
                        // incomplete reference, is a subarray.
                        ope.type = OP_RUNTIME;
                        ope.array = value.array;
                        ope.op = 'idref';
                    } else {
                        ope.type = OP_ID_REF;
                        ope.array = false;
                    }
                    if (typeof value.value === 'undefined' || value.value === null) {
                        ope.id = value.id;
                    } else {
                        ope.id = typeof value.value === 'object' ? value.value.id : value.value;
                    }
                    assert(typeof value.type === 'string');
                    ope.refType = value.type;
                    if (value.next) ope.next = value.next;
                    if (value.prior) ope.next = value.prior;
                    if (typeof value.row !== 'undefined') {
                        ope.row = value.row;
                    }
                    se.operands[index] = ope;
                    continue;
                }
                console.log(value);
                console.log(se.operands[index]);
//                value.dump();
                throw new Error('Invalid value');
            }
        }
    }
    getReference() {
        if (!this.isAlone()) {
            throw new Error(`Invalid expression by reference`);
        }
        let dope = this.cloneAloneOperand();
        if (dope.next || dope.prior) {
            throw new Error(`Invalid expression by reference`);
        }
        this.evaluateIndexes(dope);
        return dope;
    }
    isArray() {
        // only a reference could be and array.
        if (!this.isReference() || this.stack[0].operands[0].next || this.stack[0].operands[0].prior) return false;

        let ref = this.getReference();
        console.log(ref);
        EXIT_HERE;

    }
    _instance() {
        let dup = this.clone();
        const options = {instance: true}
        let stackResults = dup._evaluateOperands(options);
        dup._extendExpressions(options);
        dup._evaluteFullStack(stackResults, options);
    }
    _evaluate(value, options) {
        // stack references not replaced
        // expression references not extended (inserted)
    }
    _evaluates(values, options) {
        // do array of evaluates, for example to evaluate
        // indexes o call arguments, this method call n times
        // evaluations
        if (typeof values === 'undefined') {
            return 0;
        }
        assert (Array.isArray(values));
        let result = [];
        for (const value of values) {
            result.push(this._evaluate(value, options));
        }
        return result;
    }
    getArrayResult(results, indexes, options) {
        // this method take one of results using indexes
    }
    _evaluateOperands(options) {
        // evaluation must be from left to right (l2r) operands, inside operand
        // also evaluation is l2r: prior, value, arguments (l2r), indexes (l2r)
        // at end of this operand evaluation, must manage increment/decrement
        // options.

        // stackResults is used to store operand evaluations needed by full stack
        // evaluation.

        let stackResults = [];
        for (let stpos = 0; stpos < this.stack.length; ++stpos) {
            if (!options.instance) {
                // prepare stack of results
                stackResults.push([]);
            }
            for (let ope of this.stack[stpos].operands) {
                let next = 0;
                // if no prior defined priorValue was 0
                let priorValue = this._evaluate(ope.prior, options);

                let result = this._evaluateOperandValue(ope, stackResults, options);
                let indexes = this._evaluates(ope.indexes, options);
                if (indexes.length) {
                    // TODO: fixed access
                    result = this.getArrayResult(result, indexes, options);
                }
                // if no prior defined nextValue was 0
                let nextValue = this._evaluate(ope.next, options);

                // prior and next are excl
                if (priorValue && nextValue) {
                    throw new Error(`prior and next for same operand it's ambiguous`);
                }
                next = nextValue - priorValue;
                if (!options.instance) {
                    // store operand result
                    stackResults[stpos].push([]);
                }
            }
        }
    }
    evaluateOperandValue(ope, pos, deeply, instance = false) {
        console.log(deeply);
        console.log(ope);

        if (deeply) {
            if (ope.type === OP_STACK) {
                const stackPos = pos-ope.offset;
                this.evaluateStackPosValue(stackPos);       // TODO: cache and infinite-loops
                ope.__value = this.stack[stackPos].__value;
            }
        } else if (ope.type === OP_VALUE ) {
            ope.__value = ope.value;

        } else if (ope.type === OP_ID_REF ) {
            ope.__value = new NonRuntimeEvaluable();

        } else if (ope.type === OP_RUNTIME ) {
            let res = this.evaluateRuntime(ope, deeply);
            console.log(res);
            console.log(instance);
            // BUG: if type was an expression not apply value !!
            // if (!(res instanceof Expression)) {
            if (instance) {
                console.log(res);
                if (res instanceof Expression && res.isAlone()) {
                    res = res.getAloneOperand();
                }
                console.log(res);
                if (res instanceof Expression) {
                    res.dump();
                    console.log(ope);
                    ope.__value = res;
                } else {
                    assert(!(res instanceof Expression));
                    Object.keys(ope).forEach(key => delete ope[key]);
                    if (typeof res === 'bigint') {
                        ope.type = OP_VALUE;
                        ope.value = res;
                        delete ope.op;
                    } else {
                        if (res.value) {
                            res = res.value;
                        }
                        if (res.refType) {
                            console.log(res);
        //                    assert(NATIVE_REFS.includes(res.type));
                            assert(NATIVE_REFS.includes(res.refType));
                            ope.type = OP_ID_REF;
                            ope.refType = res.refType;
                            ope.id = res.id;
                            if (res.next) ope.next = res.next;
                            assert(typeof ope.id === 'number');
                            delete ope.op;
                        } else if (res.array) {
                            throw new InstanceArray();
                        } else {
                            console.log(res);
                            EXIT_HERE;
                        }
                    }
                }
            } else {
                ope.__value = res;
            }
        }
    }
    instance(simplify = false) {
        let dup = this.clone();
        try {
            dup.dump();
            dup.evaluateOperands(true, true);
            dup.instanceExpressions();
            dup.dump();
            const top = dup.stack.length-1;
            dup.evaluateStackPosValue(top, true);
            dup.instanceValues();
            if (simplify) {
                console.log('=== SIMPLIFY ===');
                dup.dump();
                dup.simplify();
                dup.assertInstanced();
                dup.dump();
            }
            dup.dump();
        } catch (e) {
            // It isn't possible instance an array, because not was an expression, it's an
            // array of expressions
            if (e instanceof InstanceArray) {
                throw new Error('Instancing an array');
            }
            throw e;
        }
        return dup;
    }
    eval(deeply = false) {
        if (this.stack.length === 0) {
            return this;
        }
        if (this.stack[0].op === false) {
            delete this.stack[0].operands[0].__value;
        }
        this.evaluateOperands(deeply);
        this.evaluateStackPosValue(this.stack.length-1);
        return this.stack[this.stack.length-1].__value ?? this;
    }
    evaluateStackPosValue(pos, instance = false) {
        const st = this.stack[pos];

        this.evaluateStackPosOperands(pos, true, instance);

        delete st.__value;
        const res = this.calculate(st);
        if (res !== null) {
            st.__value = res;
        }
    }
    _calculate(st, pos, stackResults) {
        if (st.op === false) {
            return stackResults[pos][0];
        }

        if (st.operands.some((x, index) => (typeof x === 'object' && x.type !== OP_VALUE && typeof stackResults[pos][index] !== 'bigint'))) {
            return null;
        }

        const opfunc = Expression.operations[st.op] ?? false;
        if (opfunc === false) {
            throw new Error(`NOT FOUND OPERATION (${st.op})`);
        }

        try {
            return opfunc.handle.apply(this, stackResults[pos]);
        } catch (e) {
            console.log([{op: st.op},...stackResults[pos]]);
            throw e;
        }
    }

    calculate(st) {
        if (st.op === false) {
            return st.operands[0].__value;
        }

        if (st.operands.some(x => (typeof x === 'object' && x.type !== OP_VALUE && typeof x.__value !== 'bigint'))) {
            return null;
        }

        const opfunc = Expression.operations[st.op] ?? false;
        if (opfunc === false) {
            throw new Error(`NOT FOUND OPERATION (${st.op})`);
        }

        const values = st.operands.map(x => x.type === 0 ? x.value : x.__value);
        try {
            return opfunc.handle.apply(this, values);
        } catch (e) {
            console.log([{op: st.op},...values]);
            throw e;
        }
    }
    isRuntimeCalculable(e) {
        const te = typeof e;
        if (te === 'string' || te === 'number' || te === 'bigint' /* || te === 'fe' */) {
            return true;
        }
        if (te === 'object' && e.type) {
            if (e.type === 'witness' && e.type === 'fixed') return false;
        }
    }
    // this method instance the expression references to include them inside
    // TODO: view how these affects to optimization.
    instanceExpressions() {
        let pos = 0;
        while (pos < this.stack.length) {
            let nextPos = true;
            for (let ope of this.stack[pos].operands) {
                // assert(ope.__value instanceof Expression === false);
                if (ope.type !== OP_RUNTIME) continue;
                console.log(ope);
                if (ope.__value instanceof Expression) {
                    ope.type = OP_STACK;
                    const exprToInsert = ope.__value.instance();
                    const next = typeof ope.next === 'number' ? ope.next : ope.__next;
                    if (next) exprToInsert.next(next);
                    ope.offset = this.insertStack(exprToInsert, pos);
                    nextPos = false;
                    break;
                }
                if (typeof ope.__value !== 'undefined' && !(ope.__value instanceof NonRuntimeEvaluable)) continue;

                // TODO: twice evaluations, be carefull double increment evaluations,etc..
                const res = this.evaluateRuntime(ope);
                if (res.value && res.value.type === OP_ID_REF) {
                    ope.type = OP_ID_REF;
                    ope.refType = res.refType;
                    ope.id = res.id;
                } else if (res instanceof Expression) {
                    ope.type = OP_STACK;
                    const exprToInsert = res.instance();
                    const next = typeof ope.next === 'number' ? ope.next : ope.__next;
                    if (next) exprToInsert.next(next);
                    ope.offset = this.insertStack(exprToInsert, pos);
                    nextPos = false;
                    break;
                }
            }
            if (nextPos) ++pos;
        }
    }
    simplify() {
        let loop = 0;
        while (this.stack.length > 0) {
            let updated = false;
            for (const st of this.stack) {
                updated = this.simplifyOperation(st) || updated;
            }
            this.compactStack();
            if (!updated) break;
        }
    }
    simplifyRuntimeToValue(st) {
        for (let index = 0; index < st.operands.length; ++index) {
            const value = st.operands[index].__value;
            if (['string', 'number', 'bigint'].includes(value)) {
                st.operands[index] = {type: OP_VALUE, value};
            }
        }
    }

    // this method simplify trivial operations as 0 + x or 1 * x, also
    // simplify operations between values, not only direct values also
    // referenced and solved values (as runtime variable)

    simplifyOperation(st) {
        if (st.op === false || st.operands.length > 2) {
            return false;
        }

        this.simplifyRuntimeToValue(st);
        const firstValue = st.operands[0].type === OP_VALUE ? st.operands[0].value : false;
        const secondValue = (st.operands.length > 1 && st.operands[1].type === OP_VALUE) ? st.operands[1].value : false;

        // [op,v1,v2] ==> [v1 op v2]
        if (firstValue !== false && secondValue !== false) {
            assert(!firstValue || (!firstValue.next && !firstValue.__next));
            assert(!secondValue || (!secondValue.next && !secondValue.__next));
            const res = this.calculate(st);
            if (res === null) return false;
            st.operands = [{type: OP_VALUE, value: res}];
            st.op = false;
            delete st.__value;
            delete st.__indexes;
            delete st.__next;
            return true;
        }

        // [neg,value] ==> [false,-value]
        if (st.op === 'neg' && firstValue !== false) {
            assert(!firstValue.next && !firstValue.__next);
            st.op = false;
            st.operands[0].value = -st.operands[0].value;
            return true;
        }

        const firstZero = firstValue === 0n;

        if (firstZero || secondValue === 0n) {
            // [mul, 0, x] ==> [0]
            // [mul, x, 0] ==> [0]
            if (st.op === 'mul') {
                st.op = false;
                st.operands = [st.operands[firstZero ? 0:1]];
                return true;
            }
            // [add, 0, x] ==> [x]
            // [add, x, 0] ==> [x]
            if (st.op === 'add') {
                st.op = false;
                st.operands = [st.operands[firstZero ? 1:0]];
                return true;
            }

            // [sub, x, 0] ==> [x]
            if (st.op === 'sub' && !firstZero) {
                st.op = false;
                return true;
            }
        }

        const firstOne = firstValue === 1n;

        // [mul, 1, x] ==> [x]
        // [mul, x, 1] ==> [x]
        if (st.op === 'mul' && (firstOne || secondValue === 1n)) {
            st.op = false;
            st.operands = [st.operands[firstOne ? 1:0]];
            return true;
        }

        // TODO: be carrefull with next, prior, inc, dec
        // x - x = 0 ???
        // (x - (- y)) = x + y
        // (x + (- y)) = x - y
        // v1 * x + v2 * x = (v1+v2) * x
        // v1 * x - v2 * x = (v1-v2) * x

        // TODO: binary cols optimizations, each kind of optimization has a key to enable/disable
        // this specific optimization.
        // BC(y) ==> y * x + (1 - y) * z = y * (z - x) + x


        // TODO: evaluate all expressions with different prime values (valid values as binary constraints 🤔)
        // detect same expressions (as bigints or as fe, bigints same implies fe same 🤔).
        // After, check matchs with other 100% sure method.

        return false;
    }

    // this method compact stack positions with one element where operation
    // was false, replace reference of this stack operation by directly value
    compactStack() {
        let translate = [];
        let stackPos = 0;
        let stackLen = this.stack.length;
        for (let istack = 0; istack < stackLen; ++istack) {
            const st = this.stack[istack];
            if (st.op === false) {
                const ope = st.operands[0];
                // two situations, for alone stack reference, use its reference and it must
                // be purged
                translate[istack] = ope.type === OP_STACK ? [true, translate[istack - ope.offset][1]] : [true, istack];
                continue;
            }

            translate[istack] = [false, stackPos++];

            // foreach operand if it's a stack reference, must be replaced by
            // new reference or by copy of reference if it was alone (no operation)
            for (let iope = 0; iope < st.operands.length; ++iope) {
                if (st.operands[iope].type !== OP_STACK) continue;
                const absolutePos = istack - st.operands[iope].offset;
                const [purge, newAbsolutePos] = translate[absolutePos];
                assert(absolutePos < istack);
                if (purge && this.stack[newAbsolutePos].op === false) {
                    // if purge and referenced position was alone, it is copied (duplicated)
                    this.stack[istack].operands[iope] = cloneDeep(this.stack[newAbsolutePos].operands[0]);
                } else {
                    // stackPos - 1 is new really istack after clear simplified stack positions
                    // calculate relative position (offset)
                    const newOffset = (stackPos - 1) - newAbsolutePos;
                    assert(newOffset > 0);
                    this.stack[istack].operands[iope].offset = newOffset;
                }
            }

        }
        // DEBUG:
        translate.forEach((value, index) => console.log(`#${index} => ${value}`));

        // move stackpositions to definitive positions, from end to begin to avoid
        // overwriting, updating last position used to remove rest of stack positions
        let lastPosUsed = false;
        for (let istack = 0; istack < stackLen; ++istack) {
            const [purge, absoluteNewPos] = translate[istack];
            if (purge) continue;

            this.stack[absoluteNewPos] = this.stack[istack];
            lastPosUsed = absoluteNewPos;
        }
        if (lastPosUsed !== false) {
            this.stack.splice(lastPosUsed + 1);
        } else {
            // all stack positions must be removed, but at least need position #0
            this.stack.splice(1);
        }

        // return if expression was updated
        return stackLen > this.stack.length;
    }
    evaluateOperands(deeply = false, instance = false) {
        for (let index = 0; index < this.stack.length; ++index) {
            this.evaluateStackPosOperands(index, deeply, instance);
        }
    }
    evaluateStackPosOperands(pos, deeply, instance = false) {
        console.log([this.stack, pos]);
        for (let ope of this.stack[pos].operands) {
            this.evaluateOperand(ope, pos, deeply, instance);
        }
    }
    evaluateOperand(ope, pos, deeply, instance = false) {
        if (!deeply) {
            this.clearNext(ope);
            this.evaluatePrior(ope);
            this.evaluateIndexes(ope);
            this.evaluateNext(ope);
            // TODO: for optimizations
            if (instance) {
                // indexes not exists when instanced !!!
                ope.next = ope.__next;
                delete ope.__next;
            }
        }
        this.evaluateOperandValue(ope, pos, deeply, instance);
        if (instance) {
            delete ope.indexes;
            delete ope._indexes;
        }
    }

    clearNext(ope) {
        ope.__next = 0;
    }
    evaluatePrior(ope) {
        if (typeof ope.prior === 'undefined') {
            return 0;
        }
        ope.__next = -this.evaluateContent(ope.prior);
        return ope.__next;
    }

    evaluateIndexes(ope) {
        if (typeof ope.indexes === 'undefined') {
            return [];
        }
        ope.__indexes = [];
        for (let index of ope.indexes) {
            ope.__indexes.push(this.evaluateContent(index));
        }
        return ope.__indexes;
    }

    evaluateNext(ope) {
        if (typeof ope.next === 'undefined') {
            return 0;
        }
        const nextValue = this.evaluateContent(ope.next);
        if (nextValue && ope.__next !== 0) {
            // it isn't possible by grammar
            throw new Error(`next and prior are incompatible between them`);
        }
        if (nextValue) {
            ope.__next = nextValue;
        }
        return ope.__next;
    }

    evaluateContent(e) {
        if (typeof e === 'bigint' || typeof e === 'number' || typeof e == 'string' || typeof e == 'boolean') {
            return e;
        }
        if (e.op == 'reference') {
            return this.evaluateReference(e);
        }
        if (e instanceof Expression) {
            return e.eval();
        }
        console.log(e);
        EXIT_HERE;
    }

    evaluateReference(e) {
        return Expression.parent.evaluateReference(e);
    }
/*    evaluateRuntime(e) {
        // function_call op:'call' function: arguments:
        // positional_param op:'positional_param' position:
        // casting op:'cast' cast: value: dim: ??
    }*/
    dump(title) {
        // console.trace();
        let caller = '';
        try {
            throw new Error();
        } catch (e) {
            caller = e.stack.split('\n')[2].trim().substring(3);
        }
        title = title ? `(${title}) `:'';
        console.log(`\x1B[38;5;214m|==========> DUMP ${title}${caller} <==========|\x1B[0m`);
        for (let index = this.stack.length-1; index >=0; --index) {
            const st = this.stack[index];
            let info =`\x1B[38;5;214m#${index} ${st.op}`;
            for (const operand of st.operands) {
                info = info + ' [\x1B[38;5;76m' + this.dumpOperand(operand,index)+'\x1B[38;5;214m]';
            }
            console.log(info+'\x1B[0m');
        }
    }
    dumpOperand(op, pos) {
        const cType = '\x1B[38;5;76m';
        const cProp = '\x1B[38;5;250m';
        const cValue = '\x1B[38;5;40m';
        switch (op.type) {
            case OP_VALUE:
                return `${cType}VALUE ${cValue}${op.value}`;
            case OP_ID_REF:
                // refType, [offset], next
                const next = op.next ? `${cProp}next:${cValue}${op.next}`:'';
                return `${cType}ID_REF ${cProp}refType:${cValue}${op.refType} ${cProp}id:${cValue}${op.id}${next}`;
            case OP_STACK:
                return `${cType}STACK ${cProp}pos:${cValue}${pos - op.offset}[-${op.offset}]`;
            case OP_RUNTIME:
                let props = ''
                for (const prop in op) {
                    if (prop === '__yystate' || prop === 'debug' || prop === 'type') continue;
                    props = props + ` ${cProp}${prop}:${cValue}${op[prop]}`;
                }
                return `${cType}RUNTIME${props}`;
        }
        return `\x1B[1;31m¿¿${op.type}??\x1B[0m`;
    }
    // TODO: cache of next
    instanceNext(next) {
        let _next = this.instance();
    }
    updateOperandNext(op, next) {
        assert(op.type != RUNTIME);

        if (op.type === OP_ID_REF) {
            op.next += next;
        }
    }
    toString(options) {
        let top = this.stack.length-1;
        if (top < 0) {
            return '(empty expression)';
        }
        return this.stackPosToString(top ,0, options);
    }
    stackPosToString(pos, pprec, options) {
        const st = this.stack[pos];
        if (typeof st === 'undefined') {
            console.log(pos);
            console.log(this.stack);
        }
        if (st.op === false) {
            return this.operandToString(st.operands[0], pos, pprec, options);
        }
        const opinfo = Expression.operations[st.op];
        let res;
        if (st.operands.length === 1) {
            res = Expression.operations[st.op].label + this.operandToString(st.operands[0], pos, opinfo.prec, options);

        } else if (st.operands.length === 2) {
            res = this.operandToString(st.operands[0], pos, opinfo.prec, options) + ' ' + Expression.operations[st.op].label + ' ' +
                  this.operandToString(st.operands[1], pos, opinfo.prec, options);
        } else {
            TODO_EXIT
        }
        if (pprec > opinfo.prec) {
            res = '(' + res + ')';
        }
        return res;
    }
    operandToString(ope, pos, pprec, options) {
        switch (ope.type) {

            case OP_VALUE:
                return ope.value.toString();
            case OP_ID_REF:
                // refType, [offset], next
                let res = (Expression.parent && (!options || !options.hideLabel))? Expression.parent.getLabel(ope.refType, ope.id, options) : false;
                if (!res) {
                    res = `${ope.refType}@${ope.id}`;
                }
                if (ope.next < 0) res = `${ope.next==-1?'':-ope.next}'${res}`;
                if (ope.next > 0) res = `${res}'${ope.next==1?'':ope.next}`;
                return res;
            case OP_STACK:
                if ((pos - ope.offset ) < 0) {
                    console.log(`invalid offset ${pos - ope.offset} pos:${pos} offset:${ope.offset}`);
                }
                return this.stackPosToString(pos-ope.offset, pprec, options);
            case OP_RUNTIME:
                if (ope.op === 'reference' && ope.name) {
                    return `RUNTIME{${ope.name}}`
                }
                return `RUNTIME{${ope.op}(${ope.name??''})}`;
                //console.log(ope);

        }

    }
    pack(container, options) {
        let top = this.stack.length-1;
        return this.stackPosPack(container, top, options);
    }
    stackPosPack(container, pos, options) {
        const st = this.stack[pos];
        if (st.op === false) {
            this.operandPack(container, st.operands[0], pos, options);
            return false;
        }
        for (const ope of st.operands) {
            this.operandPack(container, ope, pos, options);
        }
        switch (st.op) {
            case 'mul':
                return container.mul();

            case 'add':
                return container.add();

            case 'sub':
                return container.sub();

            case 'neg':
                return container.neg();

            default:
                throw new Error(`Invalid operation ${st.op} on packed expression`);
        }
    }

    operandPack(container, ope, pos, options) {
        switch (ope.type) {
            case OP_VALUE:
                container.pushConstant(ope.value);
                break;

            case OP_ID_REF:
                console.log(['PACK_OP_ID_REF',ope.refType, ope.id, ope.next]);
                this.referencePack(container, ope.refType, ope.id, ope.next, options);
                break;

            case OP_STACK:
                // TODO: expression == false;
                const eid = this.stackPosPack(container, pos-ope.offset, options);
                if (eid !== false) {        // eid === false => alone operand
                    container.pushExpression(eid);
                }
                break;

            default:
                console.log(ope);
                throw new Error(`Invalid reference ${ope.type} on packed expression`);
        }

    }
    referencePack(container, type, id, next, options) {
        // TODO stage
        switch (type) {
            case 'im':
                container.pushExpression(Expression.parent.getPackedExpressionId(id, container, options));
                break;

            case 'witness':
                container.pushWitnessCol(id, next); // TODO: stage
                break;

            case 'fixed':
                container.pushFixedCol(id, next);
                break;

            case 'public':
                container.pushPublicValue(id);
                break;

            default:
                throw new Error(`Invalid reference type ${type} to pack`);
        }
    }
    resolve() {
        const res = this.eval();
        if (res instanceof Expression) {
            return res.instance(true);
        }
        return res;
    }
}