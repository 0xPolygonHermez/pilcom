module.exports = class ExpressionItem {
    dump(options) {
        return `${this.constructor.name}()`;
    }
    get type() {
        console.log(this);
        throw new Error(`FATAL: use type obsolete-property`)
    }
}
