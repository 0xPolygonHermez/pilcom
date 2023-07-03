const Router = require("./type.js");

module.exports = class ProofTimeType extends BaseType {
    constructor (type) {
        super(type);
    }
    set next (value) {
        throw new Error(`Invalid next ${value} for runtime value`);
    }
    get next () { return false; }
}