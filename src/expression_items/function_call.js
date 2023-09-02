const RuntimeItem = require("./runtime_item.js");
module.exports = class FunctionCall extends RuntimeItem {
    constructor (name, args = [], indexes = []) {
        super();
        this.name = name;
        this.args = args.map(x => (typeof x.clone === 'function') ? x.clone() : x);
        this.indexes = indexes.map(x => (typeof x.clone === 'function') ? x.clone() : x);
    }
    setFunction(funcdef) {
        this.funcdef = funcdef;
    }
    dump(options) {
        const pre = next < 0 ? (next < -1 ? `${-next}'`:"'"):'';
        const post = next > 0 ? (next > 1 ? `'${next}`:"'"):'';
        return `Function(${pre}${this.name}${this.indexes.length > 0 ? '['+this.indexes.join(',')+']':''}${post})`;
    }
    clone() {
        let cloned = new FunctionCall(this.name, this.args, this.indexes);
        cloned.funcdef = this.funcdef;
    }
}
