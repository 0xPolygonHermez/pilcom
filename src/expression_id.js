
module.exports = class ExpressionId {
    constructor (id) {
        this.id = id;
    }
    clone() {
        return new ExpressionId(this.id);
    }
}