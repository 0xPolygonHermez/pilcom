const Expression = require("./expression.js");

module.exports = class Iterator {

    constructor (expr) {
        this.setExpression(expr);
    }
    setExpression(expr) {
        if (expr instanceof Expression === false || expr.isReference() === false) {
            throw new Error(`Invalid iterator`);
        }
        this.index = 0;
        this.expr = expr.instance();
        this.reference = this.expr.cloneAloneOperand();
        const rinfo = Expression.parent.resolveReference(this.reference);
        //  (rinfo.dim - (this.reference.dim ?? 0)) > 0
        this.reference.dim = (this.reference.dim ?? 0) + 1;
        this.deep = (this.reference.__indexes ?? []).length;
        this.reference.__indexes = [...(this.reference.__indexes ?? []),this.index];
        this.count = rinfo.lengths[0];
    }
    goFirst() {
        this.index = 0;
    }

    goLast() {
        this.index = this.count - 1;
    }

    isFirst() {
        return (this.index < 0);
    }
    isLast() {
        return (this.index === this.count);
    }

    goNext() {
        if (this.isLast()) return false;
        ++this.index;
        return true;
    }
    goPrior() {
        if (this.isFirst()) return false;
        --this.index;
        return true;
    }

    getValue() {
        // console.log(['Iterator::getValue', this.index, this.deep, this.count]);
        this.reference.__indexes[this.deep] = this.index;
        return Expression.parent._evalReference(this.reference);
    }

    *[Symbol.iterator]() {
        this.goFirst();
        while (!this.isLast()) {
            yield this.getValue();
            this.goNext();
        }
    }
}
