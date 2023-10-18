const Exceptions = require('../exceptions.js');
const {assert, assertLog} = require('../assert.js');
const ExpressionItem = require('./expression_item.js');
class ExpressionList extends ExpressionItem {

    constructor(items, debug = {}) {
        super(debug);
        this.indexes = [items.length];
        this.label = '';
        this.items = [];
        for (const item of items) {
            this.items.push(item.clone());
        }
        this._ns_ = 'ExpressionItem';
    }
    cloneInstance() {
        return new ExpressionList(this.items, this.debug);
    }
    pushItem(item) {
        assertLog(item instanceof ExpressionItem, item);
        this.items.push(item.clone());
        this.indexes = [this.items.length];
    }
}

module.exports = ExpressionList;