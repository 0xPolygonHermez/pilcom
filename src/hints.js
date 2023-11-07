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
    clear() {
        this.hints = [];
    }
    cloneHint(data, options = {}) {
        const path = options.path ?? '';
        // when data is an instance of alone Expression doesn't replace it
        // by expressionId because at end it's translate directly to the
        // single operand (witness, fixed, ...)
        if (data instanceof Expression) {
            if (data.isAlone()) {
                return data.clone();
            }
            if (options.insertExpressions) {
                return new ExpressionId(this.expressions.insert(data));
            }
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
        throw new Error(`Invalid hint-data (type:${typeof data} ${data && data.constructor ? data.constructor.name : ''}) on cloneHint of ${path}`);
    }

    getPackedExpressionId(id, container, options) {
        return this.expressions.getPackedExpressionId(id, container, options);
    }
    define(name, data) {
        const hintItem = {name, data: this.cloneHint(data, {path: name, insertExpressions: true})};
        return this.hints.push(hintItem);
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.hints.length; ++index) {
          yield this.hints[index];
        }
    }
}
