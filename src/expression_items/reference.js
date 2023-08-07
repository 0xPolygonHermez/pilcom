const RuntimeItem = require("./runtime_item.js");
module.exports = class Reference extends RuntimeItem {
    constructor (name, indexes = [], next = 0) {
        super();
        this.name = name;
        this.indexes = [...indexes];
        this.next = Number(next ?? 0);
    }
    dump(options) {
        const [pre,post] = this.getNextStrings();
        return `Reference(${pre}${this.name}${this.indexes.length > 0 ? '['+this.indexes.join(',')+']':''}${post})`;
    }
    clone() {
        return new Reference(this.name, this.indexes, this.next);
    }
}
