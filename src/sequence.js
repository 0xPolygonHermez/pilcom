const chai = require("chai");
const assert = chai.assert;
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
        this.maxSize = typeof maxSize === 'undefined' ? false : Number(maxSize);
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
        this.values = new Array(this.size);
        this.extendPos = 0;
        this._extend(this.expression);
        assert(this.extendPos === this.size);
    }
    _extend(e) {
        return this.router.go(e, '_extend');
    }
    _extendSeqList(e) {
        let count = 0;
        for(const value of e.values) {
            count += this._extend(value);
        }
        return count;
    }
    _extendSequence(e) {
        return this._extendSeqList(e);
    }
    _extendPaddingSeq(e) {
        let from = this.extendPos;
        let seqSize = this._extend(e.value);
        let remaingValues = this.paddingSize - seqSize;
        if (remaingValues < 0) {
            throw new Error(`In padding range must be space at least for one time sequence`);
        }
        while (remaingValues > 0) {
            let upto = remaingValues >= seqSize ? seqSize : remaingValues;
            for (let index = 0; index < upto; ++index) {
                this.values[this.extendPos++] = this.values[from + index];
            }
            remaingValues = remaingValues - upto;
        }
        return this.paddingSize;
    }
    _extendExpr(e) {
        const num = this.parent.getExprNumber(e);
        this.values[this.extendPos++] = num;
        return 1;
    }
    _extendRepeatSeq(e) {
        let count = 0;
        for (let itime = 0; itime < e.times; ++itime) {
            count += this._extend(e.value);
        }
        return count;
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
