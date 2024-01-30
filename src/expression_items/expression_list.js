const Exceptions = require('../exceptions.js');
const {assert, assertLog} = require('../assert.js');
const ExpressionItem = require('./expression_item.js');
const MultiArray = require('../multi_array.js');
class ExpressionList extends ExpressionItem {

    constructor(items, debug = {}) {
        super(debug);
        this.indexes = [items.length];
        this.label = '';
        this.items = [];
        for (const item of items) {
            this.items.push(item.clone());
        }
        this.array = new MultiArray([this.items.length]);
        this._ns_ = 'ExpressionItem';
    }
    dump() {
        return '[' + this.items.map(x => x.toString()).join(',')+']';
    }
    cloneInstance() {
        return new ExpressionList(this.items, this.debug);
    }
    pushItem(item) {
        assertLog(item instanceof ExpressionItem, item);
        this.items.push(item.clone());
        this.indexes = [this.items.length];
    }
    evalInside(options = {}) {
        return new ExpressionList(this.items.map(x => x.eval(options)));
    }
    getItem(indexes) {
        const index = indexes[0];
        if (index < 0 && index >= this.items.length) {
            throw new Error(`Out of bounds, try to access index ${index} but list only has ${this.items.length} elements`);
        }
        const item = this.items[index];
        if (indexes.length === 1) {
            return item;
        }
        return item.getItem(indexes.slice(1));
    }
    instance(options) {
        let _items = this.items.map(x => x.instance(options));
        return new ExpressionList(_items, this.debug);
    }
}

module.exports = ExpressionList;