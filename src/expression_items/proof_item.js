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
        const [pre,post] = this.getRowOffsetStrings();
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
    cloneUpdate(source) {
        console.log(['PROOFITEM.CLONEUPDATE', source.rowOffset]);
        super.cloneUpdate(source);
        if (source.rowOffset) {
            this.rowOffset = source.rowOffset.clone();
        }
    }
    toString(options = {}) {
        const [next, prior] = this.getRowOffsetStrings();
        // console.log(['ROWOFFSET.TOSTRING', next, prior, this.label, this.constructor.name, this.rowOffset]);
        let label = (options.hideClass ? '' : this.getTag() + '::') + this.label;
        if (options.hideLabel || !this.label) {
            label = this.getTag() + '@' + this.id;
        }
        return next + label + prior;
    }
}

