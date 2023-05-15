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
    getIndexesTypedOffset(indexes) {
        if (indexes === null || typeof indexes === 'undefined') {
            // TODO: review
            return {offset: 0};
        }
        let offset = 0;
        const dims = Math.min(this.offsets.length, indexes.length);
        for (let idim = 0; idim < dims; ++idim) {
            offset += this.offsets[idim] * indexes[idim];
        }
        if (offset >= this.size) {
            throw Error(`Internal error on variable index access`);
        }
        const dim = this.offsets.length - dims;
        // arrayType: Array(dim).fill('[]').join(''),
        return {offset, dim, lengths: dim ? this.lengths.slice(-dim):[]};
    }
    initOffsets(lengths) {
        console.log(['lengths', lengths]);
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
}