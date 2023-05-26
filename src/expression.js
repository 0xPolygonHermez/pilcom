const util = require('util');
const {cloneDeep} = require('lodash');

const OP_VALUE = 0;
const OP_ID_REF = 1;
const OP_STACK = 2;
const OP_RUNTIME = 3;

const NATIVE_OPS = ['+', '-', '*', 'neg'];

class ExpressionStackEvaluating {};
class NonRuntimeEvaluable {};
module.exports = class Expression {

    // op (string)
    // operands (array)

    // op_type --> (OP_CONST, OP_NAME_REF, OP_ID_REF, OP_STACK)
    // name (string)
    // indexes (array) --> be carrefull with clone
    // value (bingint)
    // offset (number)

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
        this.runtime = false;
    }

    setParent (parent) {
        this.parent = parent;
    }

    clone() {
        let cloned = new Expression();
        if (this.parent) cloned.parent = this.parent;
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
    // OP_ID_REF (id, refType, next)  refType = [im,witness,fixed,prover,public,((expression))]  At end need to calculate next of expression
    // OP_STACK (offset) NOTE: absolute_index = current_index - offset;
    // OP_RUNTIME (data)

    _set (operand) {
        if (this.stack.length) {
            throw new Error(`Set only could be used with empty stack`);
        }
        this.stack.push({op: false, operands: [cloneDeep(operand)]});
        this.runtime = this.runtime || operand.type === OP_RUNTIME;
    }

    setIdReference (id, refType, next) {
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
            console.log(value);
            throw new Error(`setRuntime value has a not allowed type property`);
        }
        this._set({type: OP_RUNTIME, ...value});
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

        this.runtime = this.runtime || NATIVE_OPS.indexOf(op) < 0 || bs.some((b) => b.runtime);

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
    evaluateOperandValue(op, pos, deeply) {
        if (deeply) {
            if (op.type === OP_STACK) {
                const stackPos = pos-op.offset;
                this.evaluateStackPosValue(stackPos);       // TODO: cache and infinite-loops
                op.__value = this.stack[stackPos].__value;
            }
        } else if (op.type === OP_VALUE ) {
            op.__value = op.value;

        } else if (op.type === OP_ID_REF ) {
            op.__value = new NonRuntimeEvaluable();

        } else if (op.type === OP_RUNTIME ) {
            op.__value =this.evaluateRuntime(op);
        }
    }
    evaluateRuntime(op) {
        let res = this.parent.evalRuntime(op);
        return res;
    }
/*    evalOperandValue(op, pos, deeply) {
        switch (op.type) {
            case OP_VALUE:
                return op.value;x
            case OP_ID_REF:
                return this.parent.evalIdRef();
            case OP_STACK:
                if (!deeply) return null;
                const stackPos = pos-op.offset;
                if (typeof this.stack[stackPos].__value === 'undefined') {
                    // TODO: prevent infinite loop
                    this.evalStackPos(stackPos);
                }
                return this.values[stackPos];
            case OP_RUNTIME:
                const res = this.parent.evalRuntime(op);
                return res;
        }
    }*/
    instanceValues() {
        for (let se of this.stack) {
            for (let ope of se.operands) {
                if (ope.type !== OP_RUNTIME) continue;
                const value = ope.__value;
                if (typeof value === 'bigint') {
                    ope.type = OP_VALUE;
                    ope.value = value;
                    continue;
                }
                if (typeof value === 'object' && value.type && ['witness', 'fixed', 'im', 'public'].includes(value.type)) {
                    ope.type = OP_ID_REF;
                    ope.id = value.value;
                    ope.refType = value.type;
                    if (typeof value.row !== 'undefined') {
                        ope.row = value.row;
                    }
                    continue;
                }
            }
        }
    }
    instance(parent) {
        let dup = this.clone();
        dup.eval(parent);
        dup.instanceValues();
        return dup;
    }
    eval(parent) {
        this.parent = parent;
        if (typeof parent === 'undefined') {
            console.log('BREAK-HERE');
        }
        let top = this.stack.length-1;
        this.evaluateOperands();
        this.evaluateStackPosValue(top);
        return this.stack[top].__value;
    }
    evaluateStackPosValue(pos) {
        const st = this.stack[pos];

        this.evaluateStackPosOperands(pos, true);

        if (st.op === false) {
            st.__value = st.operands[0].__value;
            return;
        }
        const opfunc = Expression.operations[st.op] ?? false;
        if (opfunc === false) {
            throw new Error(`NOT FOUND OPERATION (${st.op})`);
        }
        if (!st.operands.some(x => typeof x === 'object')) {
            st.__value = opfunc.handle.apply(this, st.operands.map(x => x.__value));
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
    evaluateOperands() {
        for (let index = 0; index < this.stack.length; ++index) {
            this.evaluateStackPosOperands(index, false);
        }
    }
    evaluateStackPosOperands(pos, deeply) {
        for (let ope of this.stack[pos].operands) {
            this.evaluateOperand(ope, pos, deeply);
        }
    }
    evaluateOperand(ope, pos, deeply) {
        if (!deeply) {
            this.evaluatePrior(ope);
            this.evaluateIndexes(ope);
            this.evaluateNext(ope);
        }
        this.evaluateOperandValue(ope, pos, deeply);
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
        ope.__next = ope.next === false ? 0n : this.evaluateContent(ope.next);
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
/*    evaluateRuntime(e) {
        // function_call op:'call' function: arguments:
        // positional_param op:'positional_param' position:
        // casting op:'cast' cast: value: dim: ??
    }*/
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
                return `${cType}ID_REF ${cProp}refType:${cValue}${op.refType} ${cProp}id:${cValue}${op.id} ${cProp}next:${cValue}${op.next}`;
            case OP_STACK:
                return `${cType}STACK ${cProp}offset:${cValue}${op.offset} ${cProp}#${cValue}${pos-op.offset}`;
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
        return this.stackPosToString(top ,0, options);
    }
    stackPosToString(pos, pprec, options) {
        const st = this.stack[pos];
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
                let res = (this.parent && !options.hideLabel)? this.parent.getLabel(ope.refType, ope.id, options) : false;
                if (!res) {
                    res = `${ope.refType}@${ope.id}`;
                }
                if (ope.next < 0) res = `${ope.next==-1?'':-ope.next}'${res}`;
                if (ope.next > 0) res = `${res}'${ope.next==1?'':ope.next}`;
                return res;
            case OP_STACK:
                return this.stackPosToString(pos-ope.offset, pprec, options);
            case OP_RUNTIME:
                console.log(ope);
                TODO;
        }

    }
}
