const ProofItem = require("./proof_item.js");
// const Sequence = require("../sequence.js");
module.exports = class FixedCol extends ProofItem {
    constructor (id) {
        super(id);
        this.rows = 0;
        this.sequence = null;
        this.values = [];
        this.fullFilled = false;
    }
    getId() {
        return this.id;
    }
    isPeriodic() {
        return this.rows > 0;
    }
    getTag() {
        return 'fixed';
    }
    getValue(row) {
        if (this.sequence === null) {
            return this.values[row]
        }
        return this.sequence.getValue(row);
    }
    set(value) {
        // REVIEW: cyclic references
        if (value instanceof Object) {
            if (this.sequence !== null) {
                EXIT_HERE;
            }
            if (this.values.length > 0) {
                EXIT_HERE;
            }
            this.sequence = value;
            this.rows = this.sequence.size;
        }
        else {
            console.log(value);
            EXIT_HERE;
        }
    }
    cloneInstance() {
        return new FixedCol(this.id);
    }
    cloneUpdate(source) {
        super.cloneUpdate(source);
        if (source.rowOffset) {
            console.log('CLONE.ROWOFFSET');
        }
        this.rows = source.rows;
        this.values = [...source.values];
        this.fullFilled = source.fullFilled;
        if (source.sequence) {
            this.sequence = source.sequence.clone();
        }
    }
}
