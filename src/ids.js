const LabelRanges = require("./label_ranges.js");
module.exports = class Ids {

    constructor (type) {
        this.lastId = 0;
        this.datas = [];
        this.type = type;
        this.labelRanges = new LabelRanges();
    }
    get length() {
        return this.lastId;
    }
    clear() {
        this.lastId = 0;
        this.datas = [];
        this.labelRanges = new LabelRanges();
    }
    reserve(count = 1, label, multiarray, data = {}) {
        // console.log(`RESERVE ${this.type} ${this.lastId}-${this.lastId+count-1} LABEL:${label}`);
        const id = this.lastId;
        this.lastId += count;
        this.datas[id] = data;
        if (label) {
            this.labelRanges.define(label, id, multiarray);
        }
        return id;
    }
    getLabel(id, options) {
        return this.labelRanges.getLabel(id, options);
    }
    get(id, offset) {
        return this.getTypedValue(id, offset)
    }

    getTypedValue(id, offset = 0) {
        return { type: this.type, value: id + offset, data: this.datas[id + offset] };
    }

    isDefined(id) {
        return (id < this.lastId)
    }

    getLastId() {
        return this.lastId
    }
    dump() {
        console.log('DUMP');
        for (const id of this.values) {
            console.log([id, this.values[id]]);
        }
    }
    countByProperty(property) {
        let res = {};
        for (const data of this.datas) {
            const key = data[property];
            res[key] = (res[key] ?? 0) + 1;
        }
        return res;
    }
    getPropertyValues(property) {
        let res = [];
        let isArray = Array.isArray(property);
        let id = 0;
        const properties = isArray ? property : [property];
        for (const data of this.datas) {
            let value;
            let pvalues = [];
            for (const _property of properties) {
                value = _property === 'id' ? id : data[_property];
                if (isArray) {
                    pvalues.push(value);
                }
            }
            res.push(isArray ? pvalues : value);
            ++id;
        }
        return res;
    }
    getPropertiesString(properties, options = {}) {
        let res = [];
        for (let id = 0; id < this.lastId; ++id) {
            const data  = this.datas[id];
            let propValues = [];
            for (const property of properties) {
                propValues.push(data[property] ?? '');
            }
            res.push(this.getLabel(id)+'@'+id+':'+propValues.join(','));
        }
        return res.join('#');
    }
}
