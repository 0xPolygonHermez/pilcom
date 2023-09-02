const RuntimeItem = require("./runtime_item.js");
module.exports = class ReferenceItem extends RuntimeItem {
    constructor (name, indexes = [], next = 0) {
        super();
        this.name = name;
        this.indexes = [...indexes];
        this.next = Number(next ?? 0);
    }
    dump(options) {
        const [pre,post] = this.getNextStrings();
        return `ReferenceItem(${pre}${this.name}${this.indexes.length > 0 ? '['+this.indexes.join(',')+']':''}${post})`;
    }
    clone() {
        let cloned = new ReferenceItem(this.name, this.indexes, this.next);
        this.cloneProperties(cloned);
    }
    cloneProperties(cloned) {
        super.cloneProperties(cloned);
    }
}
