const RuntimeItem = require("./runtime_item.js");
module.exports = class Reference extends RuntimeItem {
    constructor (name, indexes = [], next = 0) {
        super();
        this.name = name;
        this.indexes = [...indexes];
        this.next = Number(next ?? 0);
    }
    dump(options) {
        const pre = this.next < 0 ? (this.next < -1 ? `${-this.next}'`:"'"):'';
        const post = this.next > 0 ? (this.next > 1 ? `'${this.next}`:"'"):'';
        return `Reference(${pre}${this.name}${this.indexes.length > 0 ? '['+this.indexes.join(',')+']':''}${post})`;
    }
    clone() {
        return new Reference(this.name, this.indexes, this.next);
    }
}
