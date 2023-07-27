const Definitions = require("./definitions.js");

module.exports = class Subproofs extends Definitions {

    constructor (Fr, context) {
        super(Fr)
        this.context = context;
    }
}
