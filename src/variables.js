const Indexable = require("./indexable.js");

module.exports = class Variables extends Indexable {

    constructor (Fr, type) {
        super(Fr, type);
        this.undefined = 0n;
    }
    getEmptyValue(id) {
        return 0;
    }
}
