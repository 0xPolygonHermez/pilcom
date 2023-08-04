const Definitions = require("./definitions.js");
const Airs = require("./airs.js");
const Air = require("./air.js")

module.exports = class Subproof {

    constructor (context, rows, statements) {
        this.context = context;
        this.rows = rows;   // array of rows
        this.blocks = [statements];
        this.airs = new Airs();
    }
    addBlock(statements) {
        this.blocks.push(statements);
    }
}
