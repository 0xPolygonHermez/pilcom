const Router = require("./router.js");

module.exports = class Sequence {

    // TODO: Review compiler estructures
    // TODO: iterator of values without "extend"
    // TODO: check repetitive sequences (times must be same)
    // TODO: check arith_seq/geom_seq with repetitive

    constructor (parent, expression) {
        this.parent = parent;
        this.values = [];
        this.padding = false;
        this.expression = expression;
        this.router = new Router(this, 'type');
        this.size = this._sizeOf(expression);
    }
    _sizeOf(e) {
        return this.router.go(e, '_sizeOf');
    }
    _sizeOfSeqList(e) {
        let size = 0;
        for(const value of e.values) {
            size += this._sizeOf(value);
        }
        return size
    }
    _sizeOfSequence(e) {
        return this._sizeOfSeqList(e);
    }
    _sizeOfExpr(e) {
        return 1
    }
    _sizeOfRepeatSeq(e) {
        return e.times * this._sizeOf(value);
    }
    extend() {
        return this._extend(this.expression);
    }
    _extend(e) {
        return this.router.go(e, '_extend');
    }
    _extendSeqList(e) {
        let values = [];
        for(const value of e.values) {
            values = [...values, ...this._extend(value)];
        }
        return values;
    }
    _extendSequence(e) {
        return this._extendSeqList(e);
    }
    _extendExpr(e) {
        const num = this.parent.getExprNumber(e);
        return [num];
    }
    _extendRepeatSeq(e) {
        return [].concat(...this._extend(e.value).map(x => Array(e.times).fill(x)));
    }

    reserve(count, label, multiarray, data) {
        this.variables[this.lastId] = { count, type: data.type, values:[] };
        return this.lastId++;
    }
    get(id, offset) {
        console.log([id, offset,this.variables[id]]);
    }
    getTypedValue(id, offset) {
        const vdata = this.variables[id]
        return {type: vdata.type, value: vdata.values[offset] };
    }
}
