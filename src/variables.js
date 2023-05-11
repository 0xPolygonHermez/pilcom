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

    reserve(count, data) {
        this.variables[this.lastId] = { count, type: data.type, values:[] };
        return this.lastId++;
    }
    get(id, offset) {
        console.log([id, offset,this.variables[id]]);
    }
    getTypedValue(id, offset) {
        const vdata = this.variables[id]
        return {type: vdata.type, value: vdata.values[offset] };
    }
}
