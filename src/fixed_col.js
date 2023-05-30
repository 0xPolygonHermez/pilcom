const LabelRanges = require("./label_ranges.js");
const Sequence = require("./sequence.js");
module.exports = class FixedCol {
    constructor (id) {
        this.id = id;
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
    set(value) {
        if (value instanceof Sequence) {
            if (this.sequence !== null) {
                EXIT_HERE;
            }
            if (this.values.length > 0) {
                EXIT_HERE;
            }
            this.sequence = value;
        }
        else {
            console.log(value);
            EXIT_HERE;
        }
    }
}
