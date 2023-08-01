const RuntimeItem = require("./runtime_item.js");
module.exports = class Reference extends RuntimeItem {
    constructor (name, indexes = []) {
        super();
        this.name = name;
        this.indexes = indexes;
    }
    dump(options) {
        return `Reference(${this.name}${this.indexes.length > 0 ? '['+this.indexes.join(',')+']':''})`;
    }
}
