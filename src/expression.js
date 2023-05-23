const util = require('util');
const {cloneDeep} = require('lodash');

const OP_VALUE = 0;
const OP_ID_REF = 1;
const OP_STACK = 2;
const OP_RUNTIME = 3;

const NATIVE_OPS = ['+', '-', '*', 'neg'];

class ExpressionStackEvaluating {};
module.exports = class Expression {

    // op (string)
    // operands (array)

    // op_type --> (OP_CONST, OP_NAME_REF, OP_ID_REF, OP_STACK)
    // name (string)
    // indexes (array) --> be carrefull with clone
    // value (bingint)
    // offset (number)

    static operations = {
        mul:  { type: 'arith',   args: 2, handle: (a, b) => a * b,  handleFr: (Fr, a, b) => Fr.mul(a, b)},
        add:  { type: 'arith',   args: 2, handle: (a, b) => a + b,  handleFr: (Fr, a, b) => Fr.add(a, b)},
        sub:  { type: 'arith',   args: 2, handle: (a, b) => a - b,  handleFr: (Fr, a, b) => Fr.sub(a, b)},
        pow:  { type: 'arith',   args: 2, handle: (a, b) => a ** b, handleFr: (Fr, a, b) => Fr.pow(a, b)},
        neg:  { type: 'arith',   args: 1, handle: (a) => -a,        handleFr: (Fr, a) => Fr.neg(a, b)},
        gt:   { type: 'cmp',     args: 2, handle: (a, b) => (a > b  ? 1n : 0n)},
        ge:   { type: 'cmp',     args: 2, handle: (a, b) => (a >= b ? 1n : 0n)},
        lt:   { type: 'cmp',     args: 2, handle: (a, b) => (a < b  ? 1n : 0n)},
        le:   { type: 'cmp',     args: 2, handle: (a, b) => (a <= b ? 1n : 0n)},
        eq:   { type: 'cmp',     args: 2, handle: (a, b) => (a == b ? 1n : 0n)},
        ne:   { type: 'cmp',     args: 2, handle: (a, b) => (a != b ? 1n : 0n)},
        and:  { type: 'logical', args: 2, handle: (a, b) => (a && b ? 1n : 0n)},
        or:   { type: 'logical', args: 2, handle: (a, b) => (a || b ? 1n : 0n)},
        shl:  { type: 'bit',     args: 2, handle: (a, b) => (a << b ? 1n : 0n)},
        shr:  { type: 'bit',     args: 2, handle: (a, b) => (a >> b ? 1n : 0n)},
        band: { type: 'bit',     args: 2, handle: (a, b) => (a & b  ? 1n : 0n)},
        bor:  { type: 'bit',     args: 2, handle: (a, b) => (a | b  ? 1n : 0n)},
        bxor: { type: 'bit',     args: 2, handle: (a, b) => (a ^ b  ? 1n : 0n)},
        not:  { type: 'logical', args: 1, handle: (a) => (a ? 0n : 1n)},
    }

    constructor () {
        this.stack = [];
        this.runtime = false;
    }

    clone() {
        let cloned = new Expression();
        cloned.pushStack(this);
        return cloned;
    }

    pushStack(e) {
        if (!(e instanceof Expression)) {
            throw new Error(`pushStack parameter must be an Expression`);
        }
        const count = e.stack.length;
        for (let index = 0; index < count; ++index) {
            this.stack.push(cloneDeep(e.stack[index]));
        }
        return count;
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

    getAloneOperand () {
        return this.stack[0].operands[0];
    }

    isReference () {
        // TODO: review if best place?
        return (this.isAlone() && this.stack[0].operands[0].type === OP_RUNTIME && this.stack[0].operands[0].op === 'reference');
    }

    // OP_VALUE (value)
    // OP_NAME_REF (name, indexes, next)      ╮
    // OP_ID_REF (id, refType, [offset], next)  <╯
    // OP_STACK (offset) NOTE: absolute_index = current_index - offset;
    // OP_RUNTIME (data)

    _set (operand) {
        if (this.stack.length) {
            throw new Error(`Set only could be used with empty stack`);
        }
        this.stack.push({op: false, operands: [cloneDeep(operand)]});
        this.runtime = this.runtime || operand.type === OP_RUNTIME;
    }

    setIdReference (id, refType, offset, next) {
        this._set({type: OP_ID_REF, id, refType, offset, next});
    }

    setValue (value) {
        if (typeof value === 'object') {
            throw new Error(`object(${value.constructor.name}) as value not allowed`);
        }
        this._set({type: OP_VALUE, value});
    }

    setRuntime (value) {
        this._set({...value, type: OP_RUNTIME });
    }

    insertOne (op, b) {
        const aIsEmpty = this.stack.length === 0;
        const bIsEmpty = b.stack.length === 0;
        this.runtime = this.runtime || b.runtime || NATIVE_OPS.indexOf(op) < 0;

        if (bIsEmpty) {
            throw new Error(`insert without operands`);
        }
        const aIsAlone = this.isAlone();
        const bIsAlone = b.isAlone();
        if (aIsAlone) {    // aIsAlone => !aIsEmpty
            if (bIsAlone) {
                this.stack[0].op = op;
                this.stack[0].operands.push(b.cloneAlone());
                return;
            }
            // aIsAlone && !bIsAlone && !bIsEmpty
            const apre = this.stack[0];
            this.stack = [];
            this.pushStack(b);
            this.stack.push({op, operands: [apre.operands[0], {type: OP_STACK, offset: 1}]});
            return;
        }

        // !aIsAlone
        if (bIsAlone) {
            let operandA = aIsEmpty ? [] : [{type: OP_STACK, offset: 1}];
            this.stack.push({op, operands: [...operandA, b.cloneAlone()]});
            return;
        }

        // !aIsAlone (aIsEmpty?) && !bIsAlone
        const count = this.pushStack(b);
        if (aIsEmpty) {
            this.stack.push({op, operands: [{type: OP_STACK, offset: 1}]});
            return;
        }
        this.stack.push({op, operands: [{type: OP_STACK, offset: count + 1}, {type: OP_STACK, offset: 1}]});
    }

    insert (op, ...bs) {
        if (bs.length === 1) {
            return this.insertOne(op, bs[0]);
        }
        const anyEmptyB = bs.some((b) => b.stack.length === 0);
        const aIsEmpty = this.stack.length === 0;

        this.runtime = this.runtime || NATIVE_OPS.indexOf(op) < 0 || bs.some((b) => b.runtime);

        if (anyEmptyB) {
            throw new Error(`insert without operands`);
        }
        const aIsAlone = this.isAlone();
        const allBsAreAlone = bs.reduce((res, b) => res && b.isAlone(), true);

        let elem = {op, operands: []};
        if (aIsAlone) {  // aIsAlone => !aIsEmpty
            if (allBsAreAlone) {
                this.stack[0].op = op;
                for (const b of bs) {
                    this.stack[0].operands.push(b.cloneAlone());
                }
                return;
            }
            elem.operands.push(this.cloneOperand(this.stack[0].operands[0]));
            this.stack = [];
        }

        let counts = [];
        for (const b of bs) {
            counts.push(b.isAlone() ? 0 : this.pushStack(b));
        }
        counts.push(1);
        for (let index = counts.length - 2; index >= 0; --index) {
            counts[index] += counts[index + 1];
        }

        if (!aIsAlone && !aIsEmpty) {
            elem = {op, operands: [{type: OP_STACK, offset: counts[0]}]};
        }
        let index = 0;
        for (const b of bs) {
            elem.operands.push(b.isAlone() ? b.cloneAlone() : {type: OP_STACK, offset: counts[++index]});
        }
        this.stack.push(elem);
    }
    evalOperand(op, pos) {
        switch (op.type) {
            case OP_VALUE:
                return op.value;
            case OP_ID_REF:
                return this.parent.evalIdRef();
            case OP_STACK:
                const stackPos = pos-op.offset;
                if (typeof this.values[stackPos] === 'undefined') {
                    // TODO: prevent infinite loop
                    this.evalStackPos(stackPos);
                    if (typeof this.values[stackPos] === 'undefined') EXIT_HERE;
                }
                return this.values[stackPos];
            case OP_RUNTIME:
                const res = this.parent.evalRuntime(op);
                return res;
        }
    }
    eval(parent) {
        this.parent = parent;
        if (typeof parent === 'undefined') {
            console.log('BREAK-HERE');
        }
        this.values = [];
        let top = this.stack.length-1;
        // this.dump();
        this.instance();
        this.evalStackPos(top);
        return this.values[top];
    }
    evalStackPos(pos) {
        const st = this.stack[pos];
        let operandValues = [];
        let allOperandsAreRuntimeCalculable = true;
        // console.log(`\x1B[1;34m**** STACK[${pos}] ****\x1B[0m`);
/*        for (const op of st.operands) {
            // console.log(`\x1B[34mSTACK[${pos}]-OP\x1B[0m`);
            let value = this.evalOperand(op, pos);
            if (typeof value === 'undefined') {
                console.log('ERROR CALCULATION OPERAND');
                console.log(value);
                console.log(op);
                EXIT_HERE;
            }
            allOperandsAreRuntimeCalculable &= this.isRuntimeCalculable(value);
            operandValues.push(value);
        }
        if (!allOperandsAreRuntimeCalculable) {
            console.log('SOME-OPERANDS-ARE-NOT-RUNTIME-CALCULABLE');
            console.log(operandValues);
            EXIT_HERE;
        }*/
        if (st.op === false) {
            this.values[pos] = st.operands[0].__value;
            return;
        }
        const opfunc = Expression.operations[st.op] ?? false;
        if (opfunc === false) {
            console.log(`NOT FOUND OPERATION (${st.op})`);
            EXIT_HERE;
        }
        this.values[pos] = opfunc.handle.apply(this, st.operands.map(x => x.__value));
    }
    simply() {
        // not evaluate all. example: x !== 0 ? a / x : 0
        // no ternary operations pending
        // first, replace referenced expressions
        // replace variables, function calls, constants

        for (let index = 0; index < this.stack.length; ++index) {
            for (let op of this.stack[index].operands) {
                if (op.type !== OP_STACK) continue;
                const tvalue = typeof this.values[index - op.offset];
                if (tvalue === 'undefined') continue;
                if (tvalue !== 'bigint' && tvalue !== 'number') { // TODO:Fr
                    console.log(this.values[index - op.offset]);
                    WARNING_HERE;
                }
                op.type = OP_VALUE;
                delete op.offset;
                op.value = this.values[index - op.offset];
            }
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
    instance() {
        for (let index = 0; index < this.stack.length; ++index) {
            this.instanceStackElement(this.stack[index], index);
        }
    }
    instanceStackElement(se, pos) {
        for (let ope of se.operands) {
            this.instanceOperand(ope);
            ope.__value = this.evalOperand(ope, pos);
            if (typeof ope.__value === 'undefined') {
                console.log('ERROR CALCULATION OPERAND');
                console.log(value);
                console.log(ope);
                EXIT_HERE;
            }
            // allOperandsAreRuntimeCalculable &= this.isRuntimeCalculable(op.__value);
        }
    }
    instanceOperand(ope) {
        this.evaluatePrior(ope);
        this.evaluateIndexes(ope);
        this.evaluateNext(ope);
        // this.evaluateInside(ope);
    }

    evaluatePrior(ope) {
        if (typeof ope.prior === 'undefined') {
            return 0;
        }
        ope.__prior = this.evaluateContent(ope.prior);
        return ope.__prior;
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
        ope.__next = this.evaluateContent(ope.next);
        return ope.__next;
    }

    evaluateContent(e) {
        if (typeof e === 'bigint' || typeof e === 'number' || typeof e == 'string' || typeof e == 'boolean') {
            return e;
        }
        if (e.op == 'reference') {
            return this.evaluateReference(e);
        }
        if (e.type === 'expr') {
            return e.expr.eval(this.parent);
        }
        EXIT_HERE;
    }

    evaluateReference(e) {
        return this.parent.evaluateReference(e);
    }
    evaluateRuntime(e) {
        // function_call op:'call' function: arguments:
        // positional_param op:'positional_param' position:
        // casting op:'cast' cast: value: dim: ??
    }
    dump() {
        console.log(`\x1B[38;5;214m|==========> DUMP <==========|\x1B[0m`);
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
                return `${cType}ID_REF ${cProp}refType:${cValue}${op.refType} ${cProp}offset:${cValue}${op.offset} ${cProp}next:${cValue}${op.next}`;
            case OP_STACK:
                return `${cType}VALUE ${cProp}offset:${cValue}${op.offset} ${cProp}#${cValue}${pos-op.offset}`;
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
}
