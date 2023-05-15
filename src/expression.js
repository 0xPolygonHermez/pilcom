const util = require('util');

const OP_VALUE = 0;
const OP_NAME_REF = 1;
const OP_ID_REF = 2;
const OP_STACK = 3;
module.exports = class Expression {

    // op (string)
    // operands (array)

    // op_type --> (OP_CONST, OP_NAME_REF, OP_ID_REF, OP_STACK)
    // name (string)
    // indexes (array) --> be carrefull with clone
    // value (bingint)
    // offset (number)

    // op operand_A operand_B
    // op operand_A
    // nop operand_A
    // empty


    constructor () {
        this.stack = [];
        this.values = [];
    }

    clone() {
        let cloned = new Expression();
        cloned.cloneStack(this);
        return cloned;
    }
    pushStack(e) {
        if (!(e instanceof Expression)) {
            throw new Error(`cloneStack parameter must be an Expression`);
        }
        const count = e.stack.length;
        for (let index = 0; index < count; ++index) {
            this.stack.push(e.cloneStackElement(e.stack[index]));
        }
        return count;
    }
    cloneStackElement(se) {
        let dup = {...se};
        const count = dup.operands.length;
        for (let iop = 0; iop < count; ++iop) {
            dup.operands[iop] = this.cloneOperator(dup.operands[iop]);
        }
        return dup;
    }
    cloneOperator(operator) {
        let opdup = {...operator};
        if (opdup.indexes) {
            opdup.indexes = [...opdup.indexes];
        }
        return opdup;
    }
    cloneAlone() {
        return this.cloneOperator(this.stack[0].operands[0]);
    }

    isAlone () {
        return this.stack.length === 1 && this.stack[0].op === false;
    }

    // OP_VALUE (value)
    // OP_NAME_REF (name, indexes, next)      ╮
    // OP_ID_REF (id, refType, [offset], next)  <╯
    // OP_STACK (offset) NOTE: absolute_index = current_index - offset;

    _set (operand) {
        if (this.stack.length) {
            throw new Error(`Set only could be used with empty stack`);
        }
        this.stack.push({op: false, operands: [operand]});
    }

    setNameReference (name, indexes, next) {
        this._set({type: OP_NAME_REF, name, indexes: [...indexes], next});
    }
    setIdReference (id, refType, offset, next) {
        this._set({type: OP_ID_REF, id, refType, offset, next});
    }
    setValue (value) {
        this._set({type: OP_VALUE, value: BigInt(value)});
    }

    // A EMPTY, B EMPTY => ERROR
    // A EMPTY, B NOP => ERROR
    // A EMPTY, B OP => ERROR
    // A NOP, B NOP => update(O, A, B)
    // A NOP, B OP => pop() + pushStack() + push(O, A, B)
    // A OP, B NOP => push(O, A, B)
    // A OP, B OP => pushStack() + push(O, A, B)

    insertOne (op, b) {
        if (this.stack.length === 0 || b.stack.length === 0) {
            throw new Error(`insert without operand`);
        }
        const aIsAlone = this.isAlone();
        const bIsAlone = b.isAlone();
        if (aIsAlone) {
            if (bIsAlone) {
                this.stack[0].op = op;
                this.stack[0].operands.push(b.cloneAlone());
                return;
            }
            // aIsAlone && !bIsAlone
            const apre = this.stack[0];
            this.stack = [];
            this.pushStack(b);
            this.stack.push({op, operands: [apre.operands[0], {type: OP_STACK, offset: 1}]});
            return;
        }

        // !aIsAlone
        if (bIsAlone) {
            this.stack.push({op, operands: [{type: OP_STACK, offset: 1}, b.cloneAlone()]});
            return;
        }

        // !aIsAlone && !bIsAlone
        const count = this.pushStack(b);
        this.stack.push({op, operands: [{type: OP_STACK, offset: count + 1}, {type: OP_STACK, offset: 1}]});

    }
    insert (op, ...bs) {
        if (bs.length === 1) {
            return this.insertOne(op, bs[0]);
        }
        const anyEmptyB = bs.reduce((res, b) => res || b.stack.length === 0, false);
        if (this.stack.length === 0 || anyEmptyB) {
            throw new Error(`insert without operand`);
        }
        const aIsAlone = this.isAlone();
        const allBsAreAlone = bs.reduce((res, b) => res && b.isAlone(), true);

        let elem;
        if (aIsAlone) {
            if (allBsAreAlone) {
                this.stack[0].op = op;
                for (const b in bs) {
                    this.stack[0].operands.push(b.cloneAlone());
                }
                return;
            }
            elem = {op, operands: [this.cloneOperator(this.stack[0].operands[0])]};
            this.stack = [];
        }

        let counts = [];
        for (const b in bs) {
            counts.push(b.isAlone() ? 0 : this.pushStack(b));
        }
        counts.push(1);
        for (let index = counts.length - 2; index >= 0; --index) {
            counts[index] += counts[index + 1];
        }

        if (!aIsAlone) {
            elem = {op, operands: [{type: OP_STACK, offset: counts[0]}]};
        }
        let index = 0;
        for (const b in bs) {
            elem.operands.push(b.isAlone() ? b.cloneAlone() : {type: OP_STACK, offset: counts[++index]});
        }
        this.stack.push(elem);
    }
}
