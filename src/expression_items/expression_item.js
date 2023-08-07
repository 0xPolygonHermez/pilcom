module.exports = class ExpressionItem {
    static _classToManager = {};

    dump(options) {
        return `${this.constructor.name}()`;
    }
    get type() {
        console.log(this);
        throw new Error(`FATAL: use type obsolete-property`)
    }
    getNext() {
        return this.next ?? 0;
    }
    getNextStrings(options) {
        const next = this.getNext();
        const pre = next < 0 ? (next < -1 ? `${-next}'`:"'"):'';
        const post = next > 0 ? (next > 1 ? `'${next}`:"'"):'';
        return [pre,post];
    }
    static setManager(cls, manager) {
        console.log(['SET_MANAGER', cls.name]);
        ExpressionItem._classToManager[cls.name] = manager;
    }
    getManager() {
        console.log(['GET_MANAGER', this.constructor.name]);
        return ExpressionItem._classToManager[this.constructor.name];
    }
}
