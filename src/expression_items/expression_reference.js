const RuntimeItem = require("./runtime_item.js");
module.exports = class ExpressionReference extends RuntimeItem {
    constructor (id, value, debug = {}) {
        super(debug);
        this.id = id;
        this.value = value;
    }
}
