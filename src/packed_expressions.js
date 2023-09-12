const util = require('util');

const OPERATOR_SYMBOLS = {mul: '*', add: '+', sub:'-', neg:'-'};
module.exports = class PackedExpressions {

    constructor () {
        this.expressions = [];
        this.values = [];
    }
    insert(expr) {
        return this.expressions.push(expr) - 1;
    }

    pop(count, operation = false) {
        if (this.values.length < count) {
            throw new Error(`Not enought elements (${this.values.length} vs ${count}) for operation ${operation}`);
        }
        return this.values.splice(-count, count);
    }
    mul() {
        const [lhs, rhs] = this.pop(2, 'mul');
        return this.insert({mul: {lhs, rhs}});
    }

    add() {
        const [lhs, rhs] = this.pop(2, 'add');
        return this.insert({add: {lhs, rhs}});
    }
    sub() {
        const [lhs, rhs] = this.pop(2, 'sub');
        return this.insert({sub: {lhs, rhs}});
    }
    neg() {
        const [value] = this.pop(1, 'neg');
        return this.insert({sub: {value}});
    }
    pushConstant (value) {
        this.values.push({constant: {value}});
    }
    pushChallenge (idx, stage = 1) {
        this.values.push({challenge: {stage, idx}});
    }
    pushSubproofValue (idx) {
        this.values.push({subproofValue: {idx}});
    }
    pushProofValue (idx) {
        this.values.push({proofValue: {idx}});
    }
    pushPublicValue (idx) {
        this.values.push({publicValue: {idx}});
    }
    pushPeriodicCol (idx, rowOffset = 0) {
        this.values.push({periodicCol: {idx, rowOffset}});
    }
    pushFixedCol (idx, rowOffset = 0) {
        this.values.push({fixedCol: {idx, rowOffset}});
    }
    pushWitnessCol (colIdx, rowOffset = 0, stage = 1) {
        this.values.push({witnessCol: {colIdx, rowOffset, stage}});
    }
    pushExpression (idx) {
        this.values.push({expression: {idx}});
    }
    dump() {
        console.log(util.inspect(this.expressions, false, null, true /* enable colors */));
    }
    exprToString(id, options) {
        const expr = this.expressions[id];
        const [op] = Object.keys(expr);
        let opes = [];
        for (const ope of Object.values(expr[op])) {
            opes.push(this.operandToString(ope, options));
        }

        if (opes.length == 1) {
            return `${OPERATOR_SYMBOLS[op]}${opes[0]}`;
        }
        return opes.join(OPERATOR_SYMBOLS[op]);
    }
    rowOffsetToString(rowOffset, e) {
        if (rowOffset < 0) {
            return (rowOffset < -1 ? `${-rowOffset}'${e}` : `'${e}`);
        }
        if (rowOffset > 0) {
            return (rowOffset > 1 ? `${e}'${-rowOffset}` : `${e}'`);
        }
        return e;
    }
    operandToString(ope, options) {
        const [type] = Object.keys(ope);
        const props = ope[type];
        switch (type) {
            case 'constant':
                return ope.constant.value;

            case 'fixedCol':
                return this.rowOffsetToString(props.rowOffset, this.getLabel('fixed', props.idx, options));

            case 'witnessCol':
                return this.rowOffsetToString(props.rowOffset, this.getLabel('witness', props.colIdx, options));

            case 'publicValue':
                return this.getLabel('public', props.idx, options);

            case 'expression':
                return '('+this.exprToString(props.idx, options)+')';

            case 'challenge':
                return this.getLabel('challenge', props.idx, options);

            case 'subproofValue':
                return this.getLabel('subproofvalue', props.idx, options);

            case 'proofValue':
                return this.getLabel('proofValue', props.idx, options);

            default:
                console.log(ope);
                throw new Error(`Invalid type ${type}`)
        }

    }
    getLabel(type, id, options) {
        options = options ?? {};
        const labels = options.labels;
        const labelsByType = options.labelsByType;
        let label;
        if (labelsByType && typeof labelsByType[type] === 'object' && typeof labelsByType[type].getLabel === 'function') {
            label = labelsByType[type].getLabel(id, options);
        } else if (typeof labels === 'object' && typeof labels.getLabel === 'function') {
            label = labels.getLabel(type, id, options);
        }
        if (!label) {
            label = `${type}@${id}`;
        }
        return label;
    }

    *[Symbol.iterator]() {
        for (let index = 0; index < this.expressions.length; ++index) {
          yield this.expressions[index];
        }
    }

}
