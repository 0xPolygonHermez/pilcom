const RuntimeItem = require("./runtime_item.js");
const Context = require('../context.js');
module.exports = class ReferenceItem extends RuntimeItem {
    constructor (name, indexes = [], next = 0) {
        super();
        this.name = name;
        this.indexes = [...indexes];
        this.next = Number(next ?? 0);
    }
    dump(options) {
        const [pre,post] = this.getNextStrings();
        return `${pre}${this.name}${this.indexes.length > 0 ? '['+this.indexes.join(',')+']':''}${post}`;
    }
    clone() {
        return new ReferenceItem(this.name, this.indexes, this.next);
    }
    eval(options = {}) {
        console.log(this);
        const item = Context.references.getItem(this.name, this.indexes);
        // TODO: next
        console.log(item);
        return item;
    }
}
