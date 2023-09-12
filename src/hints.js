const Expression = require("./expression.js");
const ExpressionId = require('./expression_id.js');

module.exports = class Hints {

    constructor (Fr, expressions) {
        this.Fr = Fr;
        this.expressions = expressions;
        this.hints = [];
    }
    clone() {
        let cloned = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        cloned.hints = [];
        for (const hint of this.hints) {
            const name = hint.name;
            cloned.hints.push({name, data: this.cloneHint(hint.data, {path: name})});
        }
        return cloned;
    }
    cloneHint(data, options = {}) {
        const path = options.path ?? '';
        if (options.insertExpressions && data instanceof Expression) {
            return new ExpressionId(this.expressions.insert(data));
        }
        if (data instanceof ExpressionId) {
            return data.clone();
        }
        if (Array.isArray(data)) {
            let result = [];
            for (let index = 0; index < data.length; ++index) {
                result.push(this.cloneHint(data[index], {...options, path: path + '[' + index + ']'}));
            }
            return result;
        }
        if (typeof data === 'bigint' || typeof data === 'number' || typeof data === 'string') {
            return data;
        }
        if (typeof data === 'object' && data.constructor.name === 'Object') {
            let result = {};
            for (const key in data) {
                result[key] = this.cloneHint(data[key],  {...options, path: path + '.' + key});
            }
            return result;
        }
        console.log(data);
        throw new Error(`Invalid hint-data (type:${typeof data}) on cloneHint of ${path}`);
    }

    getPackedExpressionId(id, container, options) {
        return this.expressions.getPackedExpressionId(id, container, options);
    }
    define(name, data) {
        return this.hints.push({name, data: this.cloneHint(data, {path: name, insertExpressions: true})});
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.hints.length; ++index) {
          yield this.hints[index];
        }
    }
}
