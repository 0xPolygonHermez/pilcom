const ExpressionItem = require("./expression_item.js");


class NonRuntimeEvaluableItem extends ExpressionItem {

    static _singletonInstance = new NonRuntimeEvaluableItem();
    constructor () {
        super();
    }
    static get () {
        return NonRuntimeEvaluableItem._singletonInstance;
    }
    cloneInstance() {
        return NonRuntimeEvaluableItem._singletonInstance;
    }
    eval(options) {
        return NonRuntimeEvaluableItem._singletonInstance;;
    }
    runtimeEvaluable() {
        return false;
    }
}
Object.freeze(NonRuntimeEvaluableItem._singletonInstance);

module.exports = NonRuntimeEvaluableItem;