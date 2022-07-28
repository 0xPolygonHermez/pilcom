
const MAX_BUFF_SIZE = 1<<9;

module.exports = class BigBuffer {
    constructor(length) {
        const nBuffers = Math.floor((length-1)/MAX_BUFF_SIZE) +1;
        this.buffers = [];
        for (let i=0; i<nBuffers-1; i++) {
            this.buffers[i] = new BigUint64Array(MAX_BUFF_SIZE);
        }
        this.buffers[nBuffers-1] = new BigUint64Array(length - MAX_BUFF_SIZE * (nBuffers -1));
        this.length = length;
        this.isBigBuffer = true;
    }

    slice(f, t) {
        if (t<f) throw new Error("From greater than to");
        if ((f<0) || (t > this.length)) throw new Error("Range check error");
        const res = new BigUint64Array(t-f);
        let o =0;
        let curBuff = Math.floor(f / MAX_BUFF_SIZE)
        let curBuffPos = f % MAX_BUFF_SIZE;
        while (o<res.length) {
            const curN = Math.min(res.length-o, this.buffers[curBuff].length - curBuffPos);
            const src = new BigUint64Array( this.buffers[curBuff].buffer, curBuffPos*8, curN);
            res.set(src, o);
            curBuff ++;
            curBuffPos = 0;
            o += curN;
        }
        return res;
    }

    getElement(i) {
        const b = Math.floor(i/MAX_BUFF_SIZE);
        const bi = i % MAX_BUFF_SIZE;
        return this.buffers[b][bi];
    }

    setElement(i, v) {
        const b = Math.floor(i/MAX_BUFF_SIZE);
        const bi = i % MAX_BUFF_SIZE;
        this.buffers[b][bi] = v;
    }

    set(buff, offset) {
        if (buff.isBigBuffer) {
            let o= offset;
            for (let i=0; i<buff.buffers.length; i++) {
                this.set(buff.buffers[i], o);
                o += buff.buffers[i].length;
            }
        } else {
            offset = offset || 0;
            let o =0;
            let curBuff = Math.floor(offset / MAX_BUFF_SIZE)
            let curBuffPos = offset % MAX_BUFF_SIZE;
            while (o<buff.length) {
                const curN = Math.min(buff.length-o, this.buffers[curBuff].length - curBuffPos);
                const src = new BigUint64Array( buff.buffer, buff.byteOffset + o*8, curN);
                this.buffers[curBuff].set(src, curBuffPos);
                curBuff ++;
                curBuffPos = 0;
                o += curN;
            }
        }
    }
};