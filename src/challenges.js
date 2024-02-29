const Indexable = require("./indexable.js");
const ChallengeItem = require("./expression_items/challenge.js");
const ChallengeDefinition = require("./definition_items/challenge.js");
module.exports = class Challenges extends Indexable {
    constructor () {
        super('challenge', ChallengeDefinition, ChallengeItem);
    }
    getEmptyValue(id, options) {
        const subproofId = options.subproofId;
        const relativeId = this.values.reduce((res, spv) => spv.subproofId === subproofId ? res + 1 : res, 0);
        let definition = super.getEmptyValue(id, {relativeId, ...options});
        return definition;
    }
}
