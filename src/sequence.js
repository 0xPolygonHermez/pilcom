const Router = require("./router.js");

class SequencePadding {
    constructor (value, size) {
        this.value = value;
        this.size = size;
    }
}
module.exports = class Sequence {

    // TODO: Review compiler estructures
    // TODO: iterator of values without "extend"
    // TODO: check repetitive sequences (times must be same)
    // TODO: check arith_seq/geom_seq with repetitive

    constructor (parent, expression, maxSize) {
        this.parent = parent;
        this.values = [];
        this.padding = false;
        this.expression = expression;
        this.router = new Router(this, 'type');
        this.maxSize = maxSize ?? false;
        this.paddingCycleSize = false;
        this.paddingSize = 0;
        this.sizeOf(expression);
    }
    getValue(index) {
        return this.values[index];
    }
    sizeOf(e) {
        this.paddingCycleSize = false;
        this.paddingSize = 0;
        const size = this._sizeOf(e);
        if (this.paddingCycleSize) {
            this.paddingSize = this.maxSize - (size - this.paddingCycleSize);
            this.size = size - this.paddingCycleSize + this.paddingSize;
        } else {
            this.size = size;
        }
        console.log(`SIZE: ${this.size}`);

        return this.size;
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
        return e.times * this._sizeOf(e.value);
    }
    _sizeOfPaddingSeq(e) {
        if (this.maxSize === false) {
            throw new Error(`Invalid padding sequence without maxSize`);
        }
        if (this.paddingCycleSize !== false) {
            throw new Error(`Invalid padding sequence, previous padding sequence has been specified`);
        }
        this.paddingCycleSize = this._sizeOf(e.value);
        console.log(`paddingCycleSize: ${this.paddingCycleSize}`);
        return this.paddingCycleSize;
    }
    extend() {
        this.values = this._extend(this.expression);
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
    _extendPaddingSeq(e) {
        let seqValues = this._extend(e.value);
        let values = [];
        let remaingValues = this.paddingSize;
        console.log(seqValues);
        while (remaingValues > 0) {
            if (remaingValues >= seqValues.length) {
                values = [...values, ...seqValues];
                remaingValues -= seqValues.length;
            } else {
                values = [...values, ...seqValues.slice(0, remaingValues)];
                remaingValues = 0;
            }
        }
        return values;
    }
    _extendExpr(e) {
        const num = this.parent.getExprNumber(e);
        return [num];
    }
    _extendRepeatSeq(e) {
        return [].concat(...this._extend(e.value).map(x => Array(e.times).fill(x)));
    }
/*
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
    } */
    toString() {
        return this.values.join(',');
    }
}
