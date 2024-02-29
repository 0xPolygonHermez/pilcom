const Definitions = require("./definitions.js");

module.exports = class Subproofs extends Definitions {
    constructor () {
        super();
    }
    getEmptyValue(id, options) {
        const subproofId = options.subproofId;
        const relativeId = this.values.reduce((res, spv) => spv.subproofId === subproofId ? res + 1 : res, 0);
        console.log(relativeId);
        EXIT_HERE;
        let definition = super.getEmptyValue(id, {relativeId, ...options});
        return definition;
    }
}
