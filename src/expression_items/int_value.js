const {assert, assertLog} = require('../assert.js');
const ValueItem = require("./value_item.js");

class IntValue extends ValueItem {
    constructor (value = 0n) {
        if (value instanceof IntValue) {
            value = value.value;
        }
        if (typeof value === 'number') {
            value = BigInt(value);
        }
        assertLog(typeof value === 'bigint', value);
        super(value);
    }
    setValue(value) {
        if (typeof value === 'number') {
            value = BigInt(value);
        }
        assert(typeof value === 'bigint');
        this.value = value;
    }
    cloneInstance() {
        return new IntValue(this.value);
    }
    static castTo(value) {
        if (value instanceof IntValue) {
            return value.value;
        }
        if (typeof value.asInt === 'function') {
            return value.asInt();
        }
        console.log(value);
        EXIT_HERE;
    }
    asInt() {
        return this.value;
    }
    asIntItem() {
        return this.clone();
    }
    asIntDefault(defaultValue) {
        return this.value;
    }
    asNumber() {
        return Number(this.value);
    }
    asBool() {
        return Number(this.value) != 0;
    }
    asStringItem() {
        return new ValueItem.StringValue(this.asString());
    }
    asString() {
        return this.value.toString();
    }
    asExpressionItem() {
        let res = new ValueItem.Expression();
        res._set(this);
        return res;
    }
    operatorAdd(valueB) {
        return new IntValue(this.asInt() + valueB.asInt());
    }
    operatorSub(valueB) {
        return new IntValue(this.asInt() - valueB.asInt());
    }
    operatorMul(valueB) {
        return new IntValue(this.asInt() * valueB.asInt());
    }
    operatorDiv(valueB) {
        return new IntValue(this.asInt() / valueB.asInt());
    }
    operatorMod(valueB) {
        return new IntValue(this.asInt() % valueB.asInt());
    }
    operatorNeg() {
        return new IntValue(-this.asInt());
    }
    operatorShl(valueB) {
        return new IntValue(this.asInt() << valueB.asInt());
    }
    operatorShr(valueB) {
        return new IntValue(this.asInt() >> valueB.asInt());
    }
    operatorBand(valueB) {
        return new IntValue(this.asInt() & valueB.asInt());
    }
    operatorBor(valueB) {
        return new IntValue(this.asInt() | valueB.asInt());
    }
    operatorBxor(valueB) {
        return new IntValue(this.asInt() ^ valueB.asInt());
    }
    operatorNot() {
        return new IntValue(this.asInt() ? 0n : 1n);
    }
    operatorGt(valueB) {
        return new IntValue(this.asInt() > valueB.asInt() ? 1n : 0n);
    }
    operatorGe(valueB) {
        return new IntValue(this.asInt() >= valueB.asInt() ? 1n : 0n);
    }
    operatorLt(valueB) {
        return new IntValue(this.asInt() < valueB.asInt() ? 1n : 0n);
    }
    operatorLe(valueB) {
        return new IntValue(this.asInt() <= valueB.asInt() ? 1n : 0n);
    }
    operatorNe(valueB) {
        return new IntValue(this.asInt() == valueB.asInt() ? 0n : 1n);
    }
    operatorAnd(valueB) {
        return new IntValue((this.asInt() && valueB.asInt()) ? 1n : 0n);
    }
    operatorOr(valueB) {
        return new IntValue((this.asInt() || valueB.asInt()) ? 1n : 0n);
    }
    operatorPow(valueB) {
        return new IntValue(this.asInt()**valueB.asInt());
    }
    operatorEq(valueB) {
        return new IntValue(this.asInt() == valueB.asInt() ? 1:0);
    }
}

ValueItem.registerClass('IntValue', IntValue);
module.exports = IntValue;