const util = require('util');
const {cloneDeep} = require('lodash');

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

    constructor () {
        this.stack = [];
        this.values = [];
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
            this.stack.push(e.cloneStackElement(e.stack[index]));
        }
        return count;
    }
    cloneStackElement(se) {
        let dup = {...se, operands: []};
        const count = se.operands.length;
        for (let iop = 0; iop < count; ++iop) {
            dup.operands.push(this.cloneOperand(se.operands[iop]));
        }
        return dup;
    }
    cloneOperand(operator) {
        let opdup = {...operator};
        if (opdup.indexes) {
            opdup.indexes = [...opdup.indexes];
        }
        return opdup;
    }
    cloneAlone() {
        return this.cloneOperand(this.stack[0].operands[0]);
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
        [indexes, next] = this.checkAndClone({},{indexes, next});
        this._set({type: OP_NAME_REF, name, indexes: [...indexes], next});
    }

    setIdReference (id, refType, offset, next) {
        [offset, next] = this.checkAndClone({id, refType},{offset, next});
        this._set({type: OP_ID_REF, id, refType, offset, next});
    }

    setValue (value) {
        if (typeof value === 'object') {
            throw new Error(`object(${value.constructor.name}) as value not allowed`);
        }
        this._set({type: OP_VALUE, value});
    }

    insertOne (op, b) {
        const aIsEmpty = this.stack.length === 0;
        const bIsEmpty = b.stack.length === 0;
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
        const anyEmptyB = bs.reduce((res, b) => res || b.stack.length === 0, false);
        const aIsEmpty = this.stack.length === 0;

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
    checkAndClone (noObjects, cloneObjects) {
        for (const objname in noObjects) {
            if (typeof noObjects[objname] !== 'object') continue;
            throw new Error(`object(${noObjects[objname].constructor.name}) as ${objname} not allowed`);
        }
        let res = [];
        for (const objname in cloneObjects) {
            res.push(typeof cloneObjects[objname] === 'object' ? cloneDeep(cloneObjects[objname]) : cloneObjects[objname]);
        }
        return res;
    }

}
