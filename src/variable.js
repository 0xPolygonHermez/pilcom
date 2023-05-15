module.exports = class Variable {
    constructor (Fr, value, vtype, lengths, debug) {
        super(Fr);
        this.values = [];
        this.type = vtype;
        this.lengths = lengths;
        this.debug = debug;
        this.calculateOffsets(this.lengths);
    }
    getValue(indexes) {
        this.checkIndexes(indexes);
        const offset = this.multi2linear(indexes);
        return this.values[offset];
    }
    setValue(indexes, value) {
        this.checkIndexes(indexes);
        const offset = this.multi2linear(indexes);
        this.checkTypeCompatibility(value, offset);
        this.values[offset] = value;
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
    multi2linear(indexes) {
        if (indexes === null || typeof indexes === 'undefined') {
            return 0;
        }
        let offset = 0;
        for (let idim = this.dim - 1; idim >= 0; --idim) {
            offset += this.offsets[idim] * indexes[idim];
        }
        if (offset >= this.size) {
            throw Error(`Internal error on variable index access`);
        }
        return offset;
    }
    calculateOffsets(lengths) {
        this.dim = (lengths === null || typeof lengths === 'undefined') ? 0:lengths.length;
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
    checkTypeCompatibility(value, offset) {
        // TODO
        return true;
    }
}