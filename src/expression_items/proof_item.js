const ExpressionItem = require("./expression_item.js");
module.exports = class ProofItem extends ExpressionItem {
    constructor (id) {
        super();
        this.id = id;
    }
    getId() {
        return this.id;
    }
}

