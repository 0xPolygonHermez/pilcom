const Indexable = require("./indexable.js");
const SubproofvalItem = require("./expression_items/subproofval.js");
const SubproofvalDefinition = require("./definition_items/subproofval.js");
module.exports = class SubproofValues extends Indexable {

    constructor () {
        super('subproofvalue', SubproofvalDefinition, SubproofvalItem)
    }
    getRelativeLabel(subproofId, id, options) {
        // TODO: arrays
        const value = this.values.find(x => x.relativeId == id && x.subproofId == subproofId);

        return value ? value.label : `subproofvalue(${subproofId},${id})`;
    }
    getEmptyValue(id, options) {
        const subproofId = options.subproofId;
        const relativeId = this.values.reduce((res, spv) => spv.subproofId === subproofId ? res + 1 : res, 0);
        let definition = super.getEmptyValue(id, {relativeId, ...options});
        return definition;
    }
    getAggreationTypesBySubproofId(subproofId) {
        return this.values.filter(x => x.subproofId == subproofId).map(x => x.aggregateType);
    }
}
