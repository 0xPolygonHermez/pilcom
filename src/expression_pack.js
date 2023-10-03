const {assert, assertLog} = require('./assert.js');
const Exceptions = require('./exceptions.js');
const ExpressionItems = require('./expression_items.js');
const Context = require('./context.js');
const { DefinitionItem } = require('./definition_items.js');

module.exports = class ExpressionPack {
    constructor() {
        this.expression = false;
    }
    set(expression) {
        this.expression = expression;
        return this;
    }
    packAlone(container, options) {
        this.operandPack(container, this.expression.getAloneOperand(), 0, options);
        return container.pop(1)[0];
    }
    pack(container, options) {
        let top = this.expression.stack.length-1;
        return this.stackPosPack(container, top, options);
    }
    stackPosPack(container, pos, options) {
        const st = this.expression.stack[pos];
        if (st.op === false) {
            this.operandPack(container, st.operands[0], pos, options);
            return false;
        }
        for (const ope of st.operands) {
            this.operandPack(container, ope, pos, options);
        }
        switch (st.op) {
            case 'mul':
                return container.mul();

            case 'add':
                return container.add();

            case 'sub':
                return container.sub();

            case 'neg':
                return container.neg();

            default:
                throw new Error(`Invalid operation ${st.op} on packed expression`);
        }
    }

    operandPack(container, ope, pos, options) {
        if (ope instanceof ExpressionItems.ValueItem) {
            container.pushConstant(ope.value);
        } else if (ope instanceof ExpressionItems.ProofItem) {
            this.referencePack(container, ope, options);
        } else if (ope instanceof ExpressionItems.StackItem) {
            const eid = this.stackPosPack(container, pos-ope.getOffset(), options);
            if (eid !== false) {        // eid === false => alone operand
                container.pushExpression(eid);
            }
        } else {
            const opeType = ope instanceof Object ? ope.constructor.name : typeof ope;
            throw new Error(`Invalid reference ${opeType} on packed expression`);
        }

    }
    referencePack(container, ope, options) {
        // TODO stage expression
        // container.pushExpression(Expression.parent.getPackedExpressionId(id, container, options));
        // break;
        const id = ope.getId();
        console.log(options);
        const def = Context.references.getDefinitionByItem(ope, options);
        console.log(ope);
        console.log(def);
        assert(typeof def === 'object')
        console.log(def instanceof ExpressionItems.ExpressionItem, DefinitionItem.prototype.constructor.name, Object.getPrototypeOf(def.constructor).name);
        assert(def instanceof DefinitionItem);
        if (ope instanceof ExpressionItems.WitnessCol) {
            // container.pushWitnessCol(id, next ?? 0, stage ?? 1)
            console.log(ope);
            // CURRENT ERROR: in this scope definition not available.
            console.log(def);
            container.pushWitnessCol(id, ope.getNext(), def.stage);

        } else if (ope instanceof ExpressionItems.FixedCol) {
            // container.pushFixedCol(id, next ?? 0);
            container.pushFixedCol(id, ope.getNext());

        } else if (ope instanceof ExpressionItems.Public) {
            // container.pushPublicValue(id)
            container.pushPublicValue(id);

        } else if (ope instanceof ExpressionItems.Challenge) {
            // container.pushChallenge(id, stage ?? 1);
            container.pushChallenge(id, def.stage);

        } else if (ope instanceof ExpressionItems.Proofval) {
            // container.pushProofValue(id)
            container.pushProofValue(id);

        } else if (ope instanceof ExpressionItems.Subproofval) {
            // container.pushSubproofValue(id)
            container.pushSubproofValue(id);
        } else {
            throw new Error(`Invalid reference class ${ope.constructor.name} to pack`);
        }
    }
}
