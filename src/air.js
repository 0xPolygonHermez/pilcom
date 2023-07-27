const { log2, getKs, getRoots } = require("./utils.js");

module.exports = class Air {

    constructor (Fr, context, rows) {
        this.Fr = Fr;
        this.context = context;
        this.rows = Number(rows);
        this.bits = log2(this.rows);
    }
}
