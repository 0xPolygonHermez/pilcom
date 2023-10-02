const RuntimeItem = require("./runtime_item.js");
const Context = require('../context.js');
const RowOffset = require('./row_offset.js');
const ExpressionItem = require('./expression_item.js');
module.exports = class ReferenceItem extends RuntimeItem {
    constructor (name, indexes = [], rowOffset) {
        super();
        this.name = name;
        this.indexes = indexes.map(index => index.clone());
        // TODO: next as expression
        this.rowOffset = RowOffset.factory(rowOffset);
        console.log(['CONSTRUCTOR.REFERENCE '+this.name, this.rowOffset, this.indexes.length > 0 ? this.indexes[0].asInt():'']);
        console.log(this.rowOffset);
    }
    set locator (value) {
        throw new Error(`setting locator on reference ${this.name} ${this.indexes.length}`);
    }
    dump(options) {
        return 'ReferenceItem('+this.toString(options)+')';
    }
    toString(options) {
        const [pre,post] = this.getRowOffsetStrings();
        return `${pre}${this.name}${this.indexes.length > 0 ? '*['+this.indexes.join(',')+']':''}${post}`;
    }
    cloneInstance() {
        // console.log(JSON.stringify(this, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        let cloned = new ReferenceItem(this.name, this.indexes, this.rowOffset);
        // console.log(JSON.stringify(this, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        // console.log(JSON.stringify(cloned, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        return cloned;
    }
    evalInside(options = {}) {
        console.log(['EVALINSIDE '+this.name, options]);
        console.log(this.rowOffset);
        console.log(this);
        if (this.rowOffset.value) {
            console.log('ROWOFFSET.EVALINSIDE');
        }
        const item = Context.references.getItem(this.name, this.indexes);
        if (this.rowOffset && !this.rowOffset.isZero()) {
            item.rowOffset = this.rowOffset.clone();
        }
        // TODO: next
        console.log(`REFERENCE ${this.name} [${this.indexes.join('][')}]`)
        console.log(item);
        return item;
    }
}
