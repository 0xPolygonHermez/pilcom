const {assert} = require('./assert.js');

class ExpressionClass {
    static cls = false;
    static set(cls) {
        this.cls = cls;
    }
    static get() {
        assert(this.cls !== false, 'ExpressionClass no initialized');
        return this.cls;
    }
    static isInstance(obj) {
        assert(this.cls !== false, 'ExpressionClass no initialized');
        return obj instanceof this.cls;
    }
}

module.exports = ExpressionClass;