const chai = require("chai");
const assert = chai.assert;
const Router = require("./router.js");

const MAX_ELEMS_GEOMETRIC_SEQUENCE = 300;
class SequencePadding {
    constructor (value, size) {
        this.value = value;
        this.size = size;
    }
}
module.exports = class Sequence {
    static geomInfoCache = [];
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
        const times = Number(this.parent.getExprNumber(e.times));
        return times  * this._sizeOf(e.value);
    }
    setPaddingSize(size) {
        if (this.maxSize === false) {
            throw new Error(`Invalid padding sequence without maxSize`);
        }
        if (this.paddingCycleSize !== false) {
            throw new Error(`Invalid padding sequence, previous padding sequence has been specified`);
        }
        this.paddingCycleSize = size;
        return this.paddingCycleSize;
    }
    _sizeOfPaddingSeq(e) {
        return this.setPaddingSize(this._sizeOf(e.value));
    }
    getRangeSeqInfo(e) {
        console.log(e);
        const fromTimes = e.from.times ? Number(this.e2num(e.from.times)): 1;
        const toTimes = e.to.times ? Number(this.e2num(e.to.times)): 1;
        if (fromTimes !== toTimes) {
            throw new Error(`In range sequence, from(${fromTimes}) and to(${toTimes}) must be same`);
        }
        return [this.e2num(e.from), this.e2num(e.to), fromTimes];
    }
    getTermSeqInfo(e) {
        const t1Times = e.t1.times ? Number(this.e2num(e.t1.times)): 1;
        const t2Times = e.t2.times ? Number(this.e2num(e.t2.times)): 1;
        const tnTimes = e.tn.times === false ? false : (e.tn.times ? Number(this.e2num(e.t2.times)): 1);
        if (t1Times !== t2Times && (tnTimes === false || tnTimes === t2Times)) {
            throw new Error(`In term sequence, t1(${t1Times}), t2(${t2Times})`+
                        (tnTimes === false ? '':` and tn(${tbTimes}`)+'must be same');
        }
        const t1 = this.e2num(e.t1);
        const t2 = this.e2num(e.t2);
        const tn = e.tn === false ? false : this.e2num(e.tn);
        if (t1 === t2) {
            throw new Error(`In term sequence, t1(${t1}), t2(${t2}) must be different`);
        }

        return [t1, t2, tn, t1Times];
    }
    _sizeOfRangeSeq(e) {
        // TODO review if negative, fe?
        const [fromValue, toValue, times] = this.getRangeSeqInfo(e);
        return Number(toValue > fromValue ? toValue - fromValue + 1n : toValue - fromValue + 1n) *  times;
    }
    _sizeOfArithSeq(e) {
        const [t1, t2, tn, times] = this.getTermSeqInfo(e);
        const delta = t2 - t1;
        if (tn !== false) {
            const distance = tn - t2;
            if ((delta > 0 && tn < t2) || (delta < 0 && tn > t2) || (distance % delta !== 0n)) {
                throw new Error(`Invalid terms of arithmetic sequence ${t1},${t2}...${tn}`);
            }
            return Number(distance/delta + 2n) * times;
        }
        else {
            return this.setPaddingSize(2);
        }
        // TODO review if negative, fe?
    }
    _extendArithSeq(e) {
        const initialExtendPos = this.extendPos;
        const [t1, t2, tn] = this.getTermSeqInfo(e);
        const delta = t2 - t1;
//         const distance = tn - t2;
        console.log({tag: 'XXXX-', t1, t2, delta, tn, paddingSize: this.paddingSize});
        const tfinal = tn === false ? t1 + delta * BigInt(this.paddingSize): tn + delta;
        console.log({tag: 'XXXXX', tn, tfinal, paddingSize: this.paddingSize});
        const times = 1;
        let value = t1;
        while (value !== tfinal) {
            for (let itimes = 0; itimes < times; ++itimes) {
                this.values[this.extendPos++] = value;
            }
            value = value + delta;
        }
        return this.extendPos - initialExtendPos;
    }
    getGeomInfo(t1, t2, tn, calculateSize = false) {
        let key = [t1, t2, tn].join('_');
        let res = Sequence.geomInfoCache[key];
        if (typeof res !== 'undefined') {
            return res;
        }

        // TODO: negative values ?
        const reverse = t1 > t2;
        const ratio = reverse ? t1/t2 : t2/t1;
        const ratioAsNum = Number(ratio);

        if ((reverse ? t2:t1) === 0n) {
            console.log({tf, ti, mod:tf % ti, reverse, t1, t2, tn});
            return [false, false, false, false, false];
        }

        if (tn === false) {
            if (calculateSize) {
                return this.setPaddingSize(2);
            }
            if (!reverse) {
                tn = t1 * (ratio ** this.paddingSize);
            }
            // TODO: reverse case
            key = [t1, t2, tn].join('_');
        }

        // TODO: review case tn !== false and reverse
        const tf = reverse ? t1 : tn;
        const ti = reverse ? tn : t1;
        if (tf % ti !== 0n || (reverse && tn > t2) || (!reverse && tn < t2)) {
            console.log({tf, ti, mod:tf % ti, reverse, t1, t2, tn});
            return [false, false, false, false, false];
        }
        const rn = tf/ti;
        let n;
        if (rn > Number.MAX_SAFE_INTEGER) {
            // Path if rn is too big to use Math.log
            n = BigInt(Math.floor(Math.log(Number.MAX_SAFE_INTEGER)/Math.log(ratioAsNum)));

            let value = rn;
            let chunks = [n];
            let chunkValue = ratio ** n;
            let chunkValues = [chunkValue];
            while (chunkValue < rn) {
                chunkValue = chunkValue * chunkValue;
                n = n * 2n;
                chunkValues.push(chunkValue);
                chunks.push(n);
            }
            n = 0n;
            for (let index = chunks.lenght - 2; index >= 0; --index) {
                if (value < chunkValues[index]) continue;
                value = value / chunkValues[index];
                n = n + chunks[index];
            }
            n = n + BigInt(Math.round(Math.log(Number(value))/Math.log(ratioAsNum)));
        }
        else {
            n = Math.round(Math.log(Number(rn))/Math.log(ratioAsNum));
        }
        res = [Number(n), reverse, ti, tf, ratio];
        if (tf !== (ti * (ratio ** BigInt(n)))) {
            throw new Error(`ERROR geometric seq calculation ${tf} !== (${ti} * (${ratio} ** ${BigInt(n)})`);
        }
        Sequence.geomInfoCache[key] = res;
        return res;
    }
    _sizeOfGeomSeq(e) {
        const [t1, t2, tn, times] = this.getTermSeqInfo(e);
        if (t1 === 0n) {
            throw new Error(`Invalid terms of geometric sequence ${t1},${t2}...${tn}`);
        }
        const [count, reverse, ti, tf, ratio] = this.getGeomInfo(t1, t2, tn);
        return count * times;
    }
    _extendGeomSeq(e) {
        const initialExtendPos = this.extendPos;
        const [t1, t2, tn] = this.getTermSeqInfo(e);
        const reverse = t1 > t2;
        const ratio = reverse ? t1 / t2 : t2 / t1;
        if (tn !== false) {
            let value = reverse ? tn : t1;
            let tfinal = reverse ? t1 : tn;
            let count = 10;
            this.extendPos = this.extendPos - (reverse ? count:0);
            const times = 1;
            while (value <= tfinal) {
                for (let itimes = 0; itimes < times; ++itimes) {
                    this.values[this.extendPos] = value;
                    this.extendPos = this.extendPos + (reverse ? -1:1);
                }
                value = value * ratio;
            }
        }
        return this.extendPos - initialExtendPos;
    }
    _extendRangeSeq(e) {
        const [fromValue, toValue, times] = this.getRangeSeqInfo(e);
        return this.extendRangeSeq(fromValue, toValue, times, fromValue > toValue ? -1n:1n);
    }
    extendRangeSeq(fromValue, toValue, times, delta = 1n, ratio = 1n) {
        const initialExtendPos = this.extendPos;
        let value = fromValue;
        console.log({fromValue,toValue});
        while (value <= toValue) {
            for (let itimes = 0; itimes < times; ++itimes) {
                this.values[this.extendPos++] = value;
            }
            value = (value + delta) * ratio;
        }
        return this.extendPos - initialExtendPos;
    }
    extend() {
        this.values = new Array(this.size);
        this.extendPos = 0;
        this._extend(this.expression);
        console.log(this.toString());
        console.log([this.extendPos, this.size]);
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
        if (seqSize < 1) {
            console.log(e.value);
            throw new Error(`Sequence must be at least one element`);
        }
        console.log({remaingValues, seqSize});
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
        console.log(e);
        const num = this.e2num(e);
        this.values[this.extendPos++] = num;
        return 1;
    }
    _extendRepeatSeq(e) {
        let count = 0;
        const times = this.e2num(e.times);
        for (let itime = 0; itime < times; ++itime) {
            count += this._extend(e.value);
        }
        return count;
    }
    e2num(e) {
        if (typeof e === 'bigint' || typeof e === 'number') {
            return e;
        }
        return this.parent.getExprNumber(e);
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
