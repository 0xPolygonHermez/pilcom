const Definitions = require("./definitions.js");
const Ids = require("./ids.js");

module.exports = class Variables {

    constructor (Fr, references, expressions) {
        // super(Fr);
        this.Fr = Fr;
        this.references = references;
        this.expressions = expressions;
        this.lastId = 0;
        this.variables = [];
    }

    reserve(count, label, multiarray, data) {
        this.variables[this.lastId] = { count, type: data.type, values:[] };
        return this.lastId++;
    }
    get(id, offset) {
        // console.log(['GET', id]);
        // console.log(this.variables[id].values[offset]);
        return this.variables[id].values[offset];
    }
    getTypedValue(id, offset) {
        const vdata = this.variables[id];
        // console.log(['VDATA', id]);
        // console.log(vdata.values[offset]);
        return {type: vdata.type, value: vdata.values[offset] };
    }
    getType(id, offset) {
        return this.variables[id].type;
    }
    set(id, offset, value) {
        // console.log(['VARIABLE_SET', id, offset, value]);
        this.variables[id].values[offset] = value;
    }
}
