const {assert, assertLog} = require("../assert.js");
class RowOffset {
    static Zero;
    constructor (index, prior = false) {
        assert(typeof index.prior === 'undefined');
        this.index = (typeof index === 'object' && typeof index.clone === 'function') ? index.clone() : index;
        assert(typeof prior === 'boolean');
        this.prior = prior;
    }
    get value() {
        if (typeof this.index === 'number') {
            return this.prior ? -this.index : this.index;
        }
        console.log(this.index);
        EXIT_HERE;
        if (this.index instanceof Expression) {

        }
    }
    static factory(index, prior = false) {
        if (typeof index === 'undefined') {
            return RowOffset.Zero;
        }
        if (index instanceof RowOffset) {
            return index.clone();
        }
        console.log(['ROWOFFSET !!!!!', index, prior]);
        assert(typeof index.prior === 'undefined');
        return new RowOffset(index, prior);
    }
    isPriorRows() {
        return this.prior && this.value !== 0;
    }
    isNextRows() {
        return !this.prior && this.value !== 0;
    }
    isZero() {
        return this.value == 0;
    }
    clone() {
        return this.cloneInstance();
    }
    cloneInstance () {
        return new RowOffset(this.index, this.prior);
    }
    getStrings() {
        const value = this.value;
        if (!value) return ['',''];
        const res = [this.prior ? `${value < -1 ? -value : ''}'`: '', this.prior ? '' : `'${value > 1 ? value : ''}`];
        console.log(['ROWOFFSET.GETSTRINGS', res]);
        return res;
    }
}

RowOffset.Zero = new RowOffset(0, false);
Object.freeze(RowOffset.Zero);

module.exports = RowOffset;