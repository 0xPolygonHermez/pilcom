// class to register differents types

module.exports = class Types {
    static types = {};

    static register(type, cls) {
        if (typeof this.types[type] !== 'undefined') {
            throw new Error(`Type ${type} already defined with class ${this.types[type]}`);
        }
        this.types[type] = cls;
    }
    static get(type) {
        if (typeof this.types[type] === 'undefined') {
            throw new Error(`Type ${type} not defined`);
        }
        return this.types[type];
    }
    static getTypeFromClass(cls) {
        for (const type in this.types) {
            if (this.types[type] === cls) return type;
        }
        return false;
    }
}
