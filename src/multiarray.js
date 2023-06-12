module.exports = class Multiarray {
    constructor (lengths, debug) {
        this.debug = debug || '';
        this.initOffsets(lengths);
    }
    checkIndexes(indexes) {
        if (indexes === null || typeof indexes === 'undefined') {
           if (this.dim === 0) return true;
           throw Error('Invalid index access'); // TODO: extra debug info
        } else if (indexes.length !== this.dim) {
            throw Error('Mismatch index valid access'); // TODO: extra debug info
        }
        for (let i = 0; i < indexes.length; ++i) {
            if (indexes[i] < 0 || indexes[i] >= this.lengths[i]) {
                throw Error(`Invalid index ${indexes[i]} on index ${i}`); // TODO: extra debug info
            }
        }
    }
    getIndexesOffset(indexes) {
        return this.getIndexesTypedOffset(indexes).offset;
    }
    offsetToIndexes(offset) {
        let level = 0;
        let indexes = [];
        while (level < this.dim) {
            const size = this.offsets[level];
            indexes.push(Math.floor(offset/size));
            offset = offset % size;
            ++level;
        }
        return indexes;
    }
    createSubArray(dim) {
        return new Multiarray(this.lengths.slice(-dim));
    }
    getIndexesTypedOffset(indexes) {
        if (indexes === null || typeof indexes === 'undefined') {
            // TODO: review
            return {offset: 0, array: this.createSubArray(this.offsets.length)};
        }
        let offset = 0;
        const dims = Math.min(this.offsets.length, indexes.length);
        for (let idim = 0; idim < dims; ++idim) {
            offset += this.offsets[idim] * Number(indexes[idim]);
        }
        if (offset >= this.size) {
            console.log(indexes);
            console.log(this);
            throw Error(`Internal error on variable index access index:${offset} valid range:[0-${this.size-1}]`);
        }
        const dim = this.offsets.length - dims;
        if (dim === 0) {
            return {offset, array: false};
        }
        // return {offset, dim, lengths: dim ? this.lengths.slice(-dim):[], array: this.createSubArray(dim)};
        return {offset, array: this.createSubArray(dim)};
    }
    initOffsets(lengths) {
        this.lengths = lengths;
        this.dim = Array.isArray(lengths) ? lengths.length: 0
        let offsets = [1];
        let size = 1;
        for (let idim = this.dim - 1; idim > 0; --idim) {
            size = size * lengths[idim];
            offsets.push(size);
        }
        // for size multiplies first offset by length of first dimension
        this.size = size * lengths[0];

        // for offsets first index length isn't rellevant
        this.offsets = offsets.reverse();
    }
    getLengths() {
        return this.lengths;
    }
    getSize() {
        return this.size;
    }
}