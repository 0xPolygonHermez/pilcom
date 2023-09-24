const ExpressionItem = require("./expression_item.js");
module.exports = class ProofItem extends ExpressionItem {
    constructor (id) {
        super();
        this.id = id;
    }
    getId() {
        return this.id;
    }
    getLabel(options) {
        const manager = this.getManager();
        if (!manager) return '';
        return manager.getLabel(this.id, options);
    }
    dump(options) {
        const [pre,post] = this.getNextStrings();
        options = options ?? {};
        const defaultType = options.type ? options.type : this.constructor.name;
        if (!options.label && !options.hideLabel && options.dumpToString) {
            options = {...options, label: this.getLabel(options)};
        }
        const label = options.label ? options.label : `${defaultType}@${this.id}`;
        return `${pre}${label}${post}`;
    }
    eval(options) {
        return this.clone();
    }
    runtimeEvaluable() {
        return false;
    }
}

