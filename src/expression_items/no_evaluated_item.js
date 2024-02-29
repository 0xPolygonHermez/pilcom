const ExpressionItem = require("./expression_item.js");


class NonEvaluatedItem extends ExpressionItem {

    static _singletonInstance = new NonEvaluatedItem();
    constructor () {
        super();
    }
    static get () {
        return NonEvaluatedItem._singletonInstance;
    }
    clone() {
        return NonEvaluatedItem._singletonInstance;
    }
    eval(options) {
        return NonEvaluatedItem._singletonInstance;;
    }
    isRuntimeEvaluable() {
        // not evaluated, but perhaps could be evaluated
        return true;
    }
}
Object.freeze(NonEvaluatedItem._singletonInstance);

module.exports = NonEvaluatedItem;