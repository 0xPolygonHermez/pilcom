const Router = require("./type.js");

module.exports = class ConstantType extends BaseType {
    constructor () {
        super('constant');
    }
}