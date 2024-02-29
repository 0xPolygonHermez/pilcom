const DefinitionItem = require("./definition_item.js");
module.exports = class RuntimeItem extends DefinitionItem {
    constructor (id, properties = {}) {
        super(id, properties);
        this.const = properties.const ?? false;
        this.initialized = false;
    }
    cloneProperties(cloned) {
        super.cloneProperties(cloned);
        cloned.const = this.const;
        cloned.initialized
    }
    setValue(value) {
        if (this.const && this.initialized) {
            throw new Error(`Setting a constant element`);
        }
        this.initialized = true;
    }
}

