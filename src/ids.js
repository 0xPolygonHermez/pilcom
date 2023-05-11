module.exports = class Ids {

    constructor (type) {
        this.lastId = 0;
        this.type = type;
    }

    reserve(count = 1) {
        const id = this.lastId;
        this.lastId += count;
        return id;
    }

    get(id, offset) {
        return this.getTypedValue(id, offset)
    }

    getTypedValue(id, offset) {
        return { type: this.type, value: id + offset }
    }

    getId() {
        return this.reserve(1)
    }

    isDefined(id) {
        return (id < this.lastId)
    }

    getLastId() {
        return this.lastId
    }
}
