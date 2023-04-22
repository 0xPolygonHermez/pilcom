const util = require('util');
module.exports = class Expression {

    constructor () {
        this.stack = [];
        this.operand = null;
    }

    _set (operand) {
        if (this.operand !== null) {
            console.log(this.operand);
            throw new Error(`Already exist pending push operand`);
        }
        this.operand = operand;
    }
    setRef (type, name, index) {
        this._set({otype: 'ref', type, name, index});
    }
    setValue (value) {
        this._set({otype: 'value', value: value});
    }
    insert (op, b) {
        const spA = this.stack.length - 1;
        const spB = this.push(b);
        let opA;
        if (this.operand === false) {
            opA = {otype: 'stack', sp: spA};
        } else {
            opA = this.operand;
            this.operand = null;
        }
        if (this.b.operand === false) {
            opB = {otype: 'stack', sp: spB};
        } else {
            opB = this.b.operand;
            this.b.operand = null;
        }

        return this.stack.push({op, a: opA, b: opB}) - 1;
    }
    push (b, offset) {
        if (b instanceof Expression) {
            const offset = this.stack.length;
            for (const e of b) {
                this.stack.push(this.dup(e, offset));
            }
        } else {
            this.stack.push(this.dup(e, offset));
        }
        return this.stack.length;
    }
    dup (b, offset) {
        if (b instanceof Expression || !Object.isObject(b)) {
            console.log(b);
            throw new Error(`Invalid duplicate element ${b}`);
        }
        return {op: b.op, a: this.dupOperand(a, offset), b: this.dupOperand(b, offset)};
    }

    dupOperand (operand, offset) {
        let operand = {...operand};
        switch (operand.otype) {
            case 'ref':
            case 'value':
                break;
            case 'stack':
                operand.sp += offset;
                break;
        }
        return operand;
    }
}
