const ProofItem = require("./proof_item.js");
const {assert, assertLog} = require('../assert.js');
module.exports = class ExpressionReference extends ProofItem {
    constructor (id, instance, options = {}) {
        super(options);
        this.id = id;
        this.instance = instance;
    }
    getTag() {
        return 'im';
    }
    static createFrom(value, options = {}) {
        assertLog(typeof options.id !== 'undefined' && typeof options.instance !== 'undefined', 
                 {value, options, msg: 'ExpressionReference.createFrom need knows id and instance'});
        return new ExpressionReference(options.id, options.instance);
    }
    cloneInstance(options) {
        return new ExpressionReference(this.id, this.instance, this.options);
    }
    evalInside(options) {
        return this;
    }
    isRuntimeEvaluable() {
        return false;
    }
}
