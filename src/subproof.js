const Definitions = require("./definitions.js");
const Airs = require("./airs.js");
const Air = require("./air.js")

module.exports = class Subproof {

    constructor (Fr, context) {
        this.Fr = Fr;
        this.context = context;
        this.airs = new Airs();
    }
}
