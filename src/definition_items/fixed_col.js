const ProofItem = require("./proof_item.js");
const Context = require('../context.js');
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
    getValue(row) {
        if (this.sequence === null) {
            return this.values[row]
        }
        return this.sequence.getValue(row);
    }
    setValue(value) {
        // REVIEW
        this.set(value);
    }
    setRowValue(row, value) {
        if (this.sequence) {
            throw new Error(`setting a row value but assigned a sequence previously ${Context.sourceTag}`);
        }
        this.values[row] = value;
    }
    getRowValue(row) {
        if (this.sequence) {
            return this.sequence.getValue(row);
        }
        return this.values[row];
    }
    set(value) {
        // REVIEW: cyclic references
        if (value instanceof Object) {
            if (this.sequence !== null) {
                console.log(value);
                console.log(value.asInt());
                console.log(this.sequence);
                this.sequence.dump();
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
    clone() {
        let cloned = new FixedCol(this.id);
        cloned.rows = this.rows;
        cloned.values = [...this.values];
        cloned.fullFilled = this.fullFilled;
        if (this.sequence) {
            cloned.sequence = this.sequence.clone();
        }
        return cloned;
    }
}
