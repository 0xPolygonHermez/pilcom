const util = require('util');
const {cloneDeep} = require('lodash');
const {assert, assertLog, assertReturnInstanceOf} = require('./assert.js');
const ExpressionOperationsInfo = require('./expression_operations_info.js');
const NonRuntimeEvaluable = require('./non_runtime_evaluable.js');
const ExpressionItems = require("./expression_items.js");
const ExpressionItem = ExpressionItems.ExpressionItem;
const ExpressionOperatorMethods = require('./expression_operator_methods.js');
const Context = require('./context.js');
const OP_VALUE = 'value';
const OP_ID_REF = 'idref';
const OP_STACK = 'stack';
const OP_RUNTIME = 'runtime';
const NATIVE_REFS = ['witness', 'fixed', 'public', 'challenge', 'subproofvalue', 'proofvalue', 'publictable'];
const NATIVE_OPS = ['add', 'sub', 'mul', 'neg'];
const VALID_NATIVE_OPS = [false, ...NATIVE_OPS];
const Exceptions = require('./exceptions.js');

// TODO: StackPos as class

function assertExpressionItem(value, info) {
    return assertReturnInstanceOf(value, ExpressionItem, info);
}
class Expression extends ExpressionItem {

    // op (string)
    // operands (array)

    // op_type --> (OP_CONST, OP_NAME_REF, OP_ID_REF, OP_STACK)
    // name (string)
    // indexes (array) --> be carrefull with clone
    // value (bingint)
    // offset (number)

    static operatorsToMethodCache = {};
    static operators = ExpressionOperatorMethods;
    static context;

    constructor () {
        super();
        this.stack = [];
        this.fixedRowAccess = false;
    }
    static createFrom(object) {
        const res = new Expression();
        res._set(object);
        return res;
    }
    get isExpression() {
        return true;
    }
    cloneInstance() {
        let cloned = new Expression();
        cloned.fixedRowAccess = this.fixedRowAccess;
        cloned.pushStack(this);
        return cloned;
    }
    emptyClone() {
        return new Expression();
    }

    pushStack(e) {
        if (!(e instanceof Expression)) {
            throw new Error(`pushStack parameter must be an Expression`);
        }
        const count = e.stack.length;
        for (let index = 0; index < count; ++index) {
            let stackPos = e.stack[index];
            console.log(stackPos);
            e.dumpStackPos(stackPos);
            let clonedStackPos = this.cloneStackPos(stackPos);
            e.dumpStackPos(stackPos);
            this.dumpStackPos(clonedStackPos);
            this.stack.push(clonedStackPos);
        }
        return count;
    }
    cloneStackPos(stackPos) {
        console.log(stackPos);
        return { op: stackPos.op,
                 operands: stackPos.operands.map(operand => assertExpressionItem(operand.clone()))};
    }
/*
    cloneDeep(e, label = '') {
        const res = cloneDeep(e);
        return res;
    }
*/
    applyNext(value) {
        this.stack.map(stack => stack.operands.map(operand => assertExpressionItem(operand.applyNext(value))));
    }
    insertStack(expressionToInsert, stackIndex) {
        const delta = expressionToInsert.stack.length;
        for (let index = stackIndex; index < this.stack.length; ++index) {
            for (const operand of this.stack[index].operands) {
                if (operand instanceof ExpressionItems.StackItem === false) continue;
                const offset = operand.getOffset();
                if ((index - offset) < stackIndex) {
                    operand.setOffset(offset + delta);
                }
            }
        }
        for (let index = this.stack.length - 1; index >= stackIndex; --index) {
            this.stack[index + delta] = this.stack[index];
        }
        for (let index = 0; index < delta; ++index) {
            console.log(index);
            console.log(expressionToInsert.stack[index]);
            this.stack[index + stackIndex] = this.cloneStackPos(expressionToInsert.stack[index]);
        }
        this.fixedRowAccess = this.fixedRowAccess || expressionToInsert.fixedRowAccess;
        return 1;
    }
    cloneAlone() {
        return assertExpressionItem(this.stack[0].operands[0].clone());
    }

    isAlone () {
        return this.stack.length === 1 && this.stack[0].op === false;
    }
    pushAloneIndex(index) {
        assert(this.isAlone());
        let operand = this.getAloneOperand().pushArrayIndex(index);
    }
    popAloneIndex() {
        assert(this.isAlone());
        return this.getAloneOperand().popArrayIndex(index);
    }
    getAloneOperand () {
        return this.stack[0].operands[0];
    }
    cloneAloneOperand () {
        return this.getAloneOperand().clone();
    }

    isReference () {
        // TODO: review if best place?
        // TODO: review if next/prior
        // return (this.isAlone() && this.stack[0].operands[0].type === OP_RUNTIME && this.stack[0].operands[0].op === 'reference' );
        return (this.isAlone() && this.stack[0].operands[0] instanceof ExpressionItems.ReferenceItem);
    }

    // OP_VALUE (value)
    // OP_ID_REF (id, refType, next)  refType = [im,witness,fixed,prover,public,((expression))]  At end need to calculate next of expression
    // OP_STACK (offset) NOTE: absolute_index = current_index - offset;
    // OP_RUNTIME (data)

    _set (operand) {
        if (this.stack.length) {
            throw new Error(`Set only could be used with empty stack`);
        }
        this.stack.push({op: false, operands: [assertExpressionItem(operand.clone())]});
    }
/*
    setIdReference (id, refType, next) {
        assert(typeof refType === 'string');
        this._set({type: OP_ID_REF, id, refType, next});
    }
/*
    setValue (value) {
        if (typeof value === 'object') {
            throw new Error(`object(${value.constructor.name}) as value not allowed`);
        }
        this._set({type: OP_VALUE, value});
    }

    setRuntime (value) {
        if (value.type) {
            throw new Error(`setRuntime value has a not allowed type property`);
        }
        this._set({type: OP_RUNTIME, ...value});
    }
*/
    isRuntime () {
        return this.stack.some(st => this.isRuntimeStackPos(st));
    }
    isRuntimeStackPos(st) {
        return ((st.op !== false &&  NATIVE_OPS.indexOf(st.op) < 0) || st.operands.some(operand  => operand instanceof ExpressionItems.RuntimeItem));
    }
/*    isRuntimeOperand(ope) {
        return (ope.type === OP_RUNTIME);
    }*/
    insertOne (op, b = false) {
        assert(b === false || b instanceof Expression);
        const aIsEmpty = this.stack.length === 0;
        const bIsEmpty = b === false || b.stack.length === 0;

        if (bIsEmpty && op !== 'not') {
            throw new Error(`insert without operands`);
        }
        const aIsAlone = this.isAlone();
        const bIsAlone = b === false || b.isAlone();
        if (bIsAlone) {    // aIsAlone => !aIsEmpty
            if (aIsAlone) {
                this.stack[0].op = op;
                // if b is false => unary operand, no second operand to add
                if (b !== false) {
                    this.stack[0].operands.push(b.cloneAlone());
                }
                return this;
            }
            // let operandA = aIsEmpty ? [] : [{type: OP_STACK, offset: 1}];
            // this.stack.push({op, operands: [...operandA, b.cloneAlone()]});
            let operandA = aIsEmpty ? [] : [new ExpressionItems.StackItem(1)];

            const stackPos = {op, operands: operandA};
            // if b is false => unary operand, no second operand to add
            if (b !== false) {
                stackPos.operands.push(b.cloneAlone());
            }
            this.stack.push(stackPos);
            return this;
        }

        // !aIsAlone (aIsEmpty?) && !bIsAlone
        const count = this.pushStack(b);
        if (aIsEmpty) {
            this.stack.push({op, operands: [new ExpressionItems.StackItem(1)]});
            return this;
        }
        this.stack.push({op, operands: [new ExpressionItems.StackItem(count + 1), new ExpressionItems.StackItem(1)]});
        return this;
    }

    insert (op, bs) {
        if (!Array.isArray(bs)) {
            return this.insertOne(op, bs);
        }
        if (bs.length === 1) {
            return this.insertOne(op, bs[0]);
        }
        // verify that all bs are expressions
        assert(bs.reduce((isExpression, b) => isExpresion = isExpression && b instanceof Expression, true));


        const anyEmptyB = bs.some((b) => b.stack.length === 0);
        const aIsEmpty = this.stack.length === 0;

        // this.runtime = this.runtime || NATIVE_OPS.indexOf(op) < 0 || bs.some((b) => b.runtime);

        if (anyEmptyB) {
            throw new Error(`insert without operands`);
        }
        const aIsAlone = this.isAlone();
        const allBsAreAlone = bs.reduce((res, b) => res && b.isAlone(), true);

        let elem = {op, operands: []};
        if (aIsAlone && allBsAreAlone) {
            this.stack[0].op = op;
            for (const b of bs) {
                this.stack[0].operands.push(b.cloneAlone());
            }
            return this;
        }

        let counts = [];
        for (const b of bs) {
            counts.push(b.isAlone() ? 0 : this.pushStack(b));
        }
        counts.push(1);
        for (let index = counts.length - 2; index >= 0; --index) {
            counts[index] += counts[index + 1];
        }

        if (!aIsEmpty) {
            elem = {op, operands: [new ExpressionItems.StackItem(counts[0])]};
        }
        let index = 0;
        for (const b of bs) {
            elem.operands.push(b.isAlone() ? b.cloneAlone() : new ExpressionItems.StackItem(counts[++index]));
        }
        this.stack.push(elem);
        return this;
    }
    evaluateAloneReference() {
        this.dump();
        assert(this.isAlone());
        let operand = this.getAloneOperand();
        if (operand instanceof ExpressionItems.RuntimeItem || operand instanceof ExpressionItems.ReferenceItem) {
            console.log(operand);
            const res = operand.eval();
            console.log(res);
            console.log(operand.toString());
            console.log(this.toString());
            return res;
/*            const res = this.evaluateRuntime(operand, true);
            console.log(operand);
            console.log(res);
            EXIT_HERE;*/
/*            if (!(res instanceof Expression)) {
                operand.__value = res;
            }*/
        }
        return operand;
    }
    assertInstanced() {
        assert(false);
        try {
            for (let ist = 0; ist < this.stack.length; ++ist) {
                const st = this.stack[ist];
                assert(VALID_NATIVE_OPS.includes(st.op), `invalid operation ${st.op} on stackpos ${ist}`);
                for (let iope = 0; iope < st.operands.length; ++iope) {
                    const ope = st.operands[iope];
                    const ref = `operand #${iope} of stackpos ${ist}`;
                    assert([OP_STACK, OP_VALUE, OP_ID_REF].includes(ope.type), `${ref} has invalid type ${ope.type}`);
                    switch (ope.type) {
                        case OP_STACK:
                            assert(typeof ope.offset === 'number', `invalid offset type (${typeof ope.offset}) on ${ref}`);
                            assert(ope.offset > 0, `invalid offset value (${ope.offset}) on ${ref}`);
                            break;

                        case OP_VALUE:
                            assert(typeof ope.value === 'bigint', `invalid value type (${typeof ope.offset}) on ${ref}`);
                            break;

                        case OP_ID_REF:
                            assert(NATIVE_REFS.includes(ope.refType), `invalid refType (${ope.refType}) on ${ref}`)
                            assert(typeof ope.id === 'number', `invalid ope.id type (${typeof ope.id}) on ${ref}`);
                            break;

                    }
                    if (ope.indexes) {
                        const indexesType = typeof ope.indexes;
                        assert(indexesType === 'array', `${ref} has invalid indexes type ${indexesType}`);
                        for (let index = 0; index < ope.indexes.length; ++index) {
                            const indexType = typeof ope.indexes[index];
                            assert(indexType === 'number',  `${ref} has invalid index[${index}] type ${indexType}`);
                        }
                    }
                }
            }
        } catch (e) {
            this.dump();
            throw e;
        }
    }
    evaluateRuntime(op, deeply = false) {
        let res = Context.expressions.evalRuntime(op, this, deeply);
        return res;
    }
    instanceValues() {
        assert(false);
        /*
        for (let se of this.stack) {
            for (let index = 0; index < se.operands.length; ++index) {
                if (se.operands[index].type !== OP_RUNTIME) continue;
                const value = se.operands[index].__value;
                if (typeof value === 'bigint') {
                    se.operands[index] = {type: OP_VALUE, value: value};
                    continue;
                }
                if (typeof value === 'object' && value.type &&
                    ['constant','witness', 'fixed', 'im', 'public', 'expr', 'challenge','subproofvalue', 'proofvalue'].includes(value.type)) {
                    let ope = {};
                    if (value.array) {
                        // incomplete reference, is a subarray.
                        ope.type = OP_RUNTIME;
                        ope.array = value.array;
                        ope.op = 'idref';
                    } else {
                        ope.type = OP_ID_REF;
                        ope.array = false;
                    }
                    if (typeof value.value === 'undefined' || value.value === null) {
                        ope.id = value.id;
                    } else {
                        ope.id = typeof value.value === 'object' ? value.value.id : value.value;
                    }
                    assert(typeof value.type === 'string');
                    ope.refType = value.type;
                    if (value.next) ope.next = value.next;
                    if (value.prior) ope.next = value.prior;
                    if (typeof value.row !== 'undefined') {
                        ope.row = value.row;
                    }
                    se.operands[index] = ope;
                    continue;
                }
                console.log(value);
                console.log(se.operands[index]);
//                value.dump();
                throw new Error('Invalid value');
            }
        }*/
    }
    getReference() {
        if (!this.isAlone()) {
            throw new Error(`Invalid expression by reference`);
        }
        let dope = this.cloneAloneOperand();
        if (dope.next || dope.prior) {
            throw new Error(`Invalid expression by reference`);
        }
        this.evaluateIndexes(dope);
        return dope;
    }
    isArray() {
        // only a reference could be and array.
        if (!this.isReference() || this.stack[0].operands[0].rowOffset) return false;

        let ref = this.getReference();
        console.log(ref);
        EXIT_HERE;

    }
    // stackResults[pos][0] contains result of this stack position,
    // in stackResults[pos][1] contains a results array of this stack position operands
    instance() {
        console.log(Context.sourceRef);
        this.dump("#############");
        let cloned = this.clone();
        const options = {instance: true}
        let stackResults = cloned.evaluateOperands(options);
        // cloned.extendExpressions(options);
        cloned.evaluateFullStack(stackResults, options);
        cloned.dump('PRE-SIMPLIFY');
        cloned.simplify();
        cloned.dump('POST-SIMPLIFY');
        // console.log(stackResults);
        // cloned.dumpStackResults(stackResults, '');
        return cloned;
    }
    evalAsValue(options) {
        return this.eval({...options, onlyAsValue: true});
    }
    eval(options = {}) {
        if (this.stack.length === 0) {
            return this;
        }
        let stackResults = this.evaluateOperands(options);
        this.evaluateFullStack(stackResults, options);
        if (!options.onlyAsValue && stackResults[0][0] instanceof ExpressionItems.NonRuntimeEvaluableItem) {
            const res = this.instance();
            return res;
        }
        const res = stackResults[this.stack.length-1][0];
        return res;
    }
    evaluateFullStack(stackResults, options) {
        this.evaluateStackPos(stackResults, this.stack.length - 1, options);
    }
    evaluateStackPos(stackResults, stackIndex, options = {}) {
        const st = this.stack[stackIndex];
        const results = stackResults[stackIndex];

        // if stackResult is evaluated return value;
        if (results[0] !== null) {
            return results[0];
        }

        // console.log([results, st.operands.length, st]);
        let values = results[1];
        for (let operandIndex = 0; operandIndex < st.operands.length; ++operandIndex) {
            const operand = st.operands[operandIndex];
            assertLog(operand instanceof ExpressionItem, [st.op, st.operands.length, operand]);
            if ((values[operandIndex] ?? null) != null) {
                continue;
            }
            if (operand instanceof ExpressionItems.StackItem) {
                values[operandIndex] = this.evaluateStackPos(stackResults, stackIndex - operand.getOffset());
            } else {
                // console.log(operand);
                values[operandIndex] = operand.eval(options);
            }
            if (options.instance) {

            }
        }
        // console.log(values);

        // console.log([st.op, ...values]);
        let value = null;
        if (values.some(value => value instanceof ExpressionItems.NonRuntimeEvaluableItem))  {
            value = ExpressionItems.NonRuntimeEvaluableItem.get();
        } else if (values.some(value => value === null))  {
            value = null;
            EXIT_HERE;
        } else if (st.op === false) {
            value = values[0];
        } else if (values.some(value => value instanceof ExpressionItems.ProofItem)) {
            value = ExpressionItems.NonRuntimeEvaluableItem.get();
        } else {
            value = this.applyOperation(st.op, values);
        }
        return (results[0] = value);
    }
    /**
     * get method name used to calculate an operation between types.
     * @param {string} operation - operation to apply on operators
     * @param {string[]|false} types - types of operators
     * */
    operatorToMethod(operation, types = false) {
        const key = 'operator_' + operation + (types === false ? '' : '_' +types.slice(1).join('_'));
        let method = Expression.operatorsToMethodCache[key];
        if (!method) {
            method = key.replace(/(\_\w)/g, x => x[1].toUpperCase());
            Expression.operatorsToMethodCache[key] = method;
        }
        return method;
    }
    /**
     * apply operation over operands values
     * @param {string} operation - operation to apply on operators
     * @param {string[]|false} values - array of ExpressionItems
     * */
    applyOperation(operation, values) {
        console.log([operation, ...values]);
        const operationInfo = ExpressionOperationsInfo.get(operation);

        if (operationInfo === false) {
            throw new Error(`Operation ${operation} not was defined`);
        }

        if (operationInfo.args !== values.length) {
            throw new Error(`Invalid number of arguments on operation ${operation}, received ${values.length} values but was expected ${operationInfo.args}`);
        }

        // assert all values must be an ExpressionItem
        values.map(value => assertLog(value instanceof ExpressionItem, value));

        let types = values.map(x => x.constructor.name);

        // if number of values was less than 2 (means 1, always was equals)
        const equals = values.length < 2 ? true : types.every(x => x === types[0]);
        let reversed = false;
        let methods = [];
        const onlyOneLoop = equals || !operationInfo.commutative || operationInfo.args != 2;

        // In this block try to found and operator method using types without transformations.
        // First search on class of first operand, if not found search on class of second operand (*)
        // (*) only if two operands and operation is commutative

        while (true) {
            const method = this.operatorToMethod(operation,  (equals ? false : types));
            methods.push(`${types[0]}.${method}`);
            const [executed, result] = this.applyOperatorMethod(method, values);
            if (executed) {
                return result;
            }
            if (onlyOneLoop) {
                break;
            }
            // onlyOneLoop === false => two loops, on second loop applies reverse again to
            // restore original values and types, also restore value of reversed
            values = values.reverse();
            types = types.reverse();
            reversed = !reversed;
            if (reversed == false) {
                break;
            }
        }

        // If not equals, in this block try to cast second operand to class of first operand, after that
        // First search on class of first operand, if not found, try to cast first operand to class of second
        // operand and search on class of second operand (*)
        // (*) only if two operands and operation is commutative
        while (!equals && operationInfo.args == 2) {
            const casting = this.castingItemMethod(types[0]);
            if (typeof values[1][casting] === 'function') {
                const method = this.operatorToMethod(operation);
                methods.push(`${types[0]}.${method}`);
                try {
                    const [executed, result] = this.applyOperatorMethod(method, [values[0], values[1][casting]()]);
                    if (executed) {
                        return result;
                    }
                }
                catch (e) {
                    if (e instanceof Exceptions.CannotBeCastToType === false) {
                        throw e;
                    }
                }
                if (onlyOneLoop) {
                    break;
                }
            }
            values = values.reverse();
            types = types.reverse();
            reversed = !reversed;
            if (reversed == false) {
                break;
            }
        }

        throw new Error(`Operation ${operation} not was defined by types ${types.join(',')} [${methods.join(', ')}]`);
    }
    castingItemMethod(type) {
        if (type === 'StringValue' || type === 'IntValue') {
            type = type.slice(0, -5);
        }
        return 'as'+type+'Item';
    }
    applyOperatorMethod (method, values) {
        console.log(`########### (${values[0].constructor.name}) METHOD ${method} ###########`);
        if (typeof values[0][method] === 'function') {
            // instance call, first value (operand) is "this", arguments rest of values (operands)
            return [true, values[0][method](...values.slice(1))];
        } else if (values[0].constructor.operators && typeof values[0].constructor.operators[method] === 'function') {
            // static call with all values (operands)
            return [true, values[0].constructor.operators[method](...values)];
        }
        return [false, false];
    }
    evaluateValue(value, options) {
        console.log(value);
        if (typeof value === 'undefined') {
            return options ? options.default ?? 0n : 0n;
        }
        // stack references not replaced
        // expression references not extended (inserted)
        console.log([typeof value, value]);
        if (value instanceof Expression) {
            value.dump();
        }
        assert(value instanceof ExpressionItems.ExpressionItem);
        if (value instanceof ExpressionItems.StackItem) {
            return value;
        } else if (value instanceof ExpressionItems.ValueItem) {
            return value;
        } else if (value instanceof ExpressionItems.ProofItem) {
            return ExpressionItems.NonRuntimeEvaluableItem.get();
        } else if (value instanceof ExpressionItems.ReferenceItem) {
            const res = Context.runtime.eval(value, {});
            console.log(util.inspect(value, false, 10, true));
            console.log(res);
            console.log(res.eval());
            return res;
        } else if (value instanceof ExpressionItems.FunctionCall) {
            console.log(util.inspect(value, false, 10, true));
            const res = value.eval();
            console.log(res);
            return res;
        } else {
            console.log(value);
            return value;
            EXIT_HERE;
        }
        return value;
    }
    evaluateValues(values, options) {
        // do array of evaluates, for example to evaluate
        // indexes o call arguments, this method call n times
        // evaluations
        if (typeof values === 'undefined') {
            return 0;
        }
        assert (Array.isArray(values));
        let result = [];
        for (const value of values) {
            result.push(this.evaluateValue(value, options));
        }
        return result;
    }
    evalAsInt(options = {}) {
        const value = this.evalAsValue(options);
        const res = value.asIntDefault(false);
        if (res === false) {
            console.log(value);
            throw new Error(this.toString() + " isn't a number");
        }
        return res;
    }
    getArrayResult(results, indexes, options) {
        console.log(results);
        console.log(indexes);
        // TODO
        return results;
        // this method take one of results using indexes
    }
    evaluateOperands(options) {
        // evaluation must be from left to right (l2r) operands, inside operand
        // also evaluation is l2r: prior, value, arguments (l2r), indexes (l2r)
        // at end of this operand evaluation, must manage increment/decrement
        // options.

        // stackResults is used to store operand evaluations needed by full stack
        // evaluation.

        let stackResults = [];
        for (let stpos = 0; stpos < this.stack.length; ++stpos) {
            let results = [null, []];
            const st = this.stack[stpos];
            stackResults.push(results);
            let operandResults = results[1];
            // console.log(st.operands);
            for (let operandIndex = 0; operandIndex < st.operands.length; ++operandIndex) {
                const operand = assertExpressionItem(st.operands[operandIndex]);

                // when evaluates single operands, StackItem is a reference to stack position
                // and it could be evaluated when all operands are left-to-right evaluated
                if (operand instanceof ExpressionItems.StackItem) continue;
                // console.log(`CALL OPERAND ${stpos}/${this.stack.length} ${operandIndex}/${st.operands.length} ${operand}`);
                const result = operand.eval(options);
                operandResults.push(result);
                if (options.instance && result !== null) {
                    if (result instanceof Expression) {
                        this.dump('THIS BEFORE INSERTSTACK');
                        result.dump('RESULT BEFORE INSERTSTACK');
                        const stackOffset = this.insertStack(result.instance(), stpos);
                        console.log(stackOffset);
                        st.operands[operandIndex] = new ExpressionItems.StackItem(stackOffset);
                        this.dump('THIS AFTER INSERTSTACK');
                    } else {
                        console.log(result);
                        st.operands[operandIndex] = assertExpressionItem(result);
                    }
                }
            }
        }
        return stackResults;
    }
    _calculate(st, pos, stackResults) {
        if (st.op === false) {
            return stackResults[pos][0];
        }

        if (stackResults[pos][1].some(x => !(x instanceof ExpressionItems.IntValue))) {
            return ExpressionItem.NonRuntimeEvaluableItem.get();
        }

        stackResults[pos][0] = this.applyOperation(st.op, stackResults[pos][1]);
        return stackResults[pos][0];
    }
    isRuntimeCalculable(e) {
        const te = typeof e;
        if (te === 'string' || te === 'number' || te === 'bigint' /* || te === 'fe' */) {
            return true;
        }
        if (te === 'object' && e.type) {
            if (e.type === 'witness' && e.type === 'fixed') return false;
        }
    }
    // this method instance the expression references to include them inside
    // TODO: view how these affects to optimization.
    instanceExpressions(options) {
        EXIT_HERE;
/*        let pos = 0;
        while (pos < this.stack.length) {
            let nextPos = true;
            for (let ope of this.stack[pos].operands) {
                // assert(ope.__value instanceof Expression === false);
                if (ope.type !== OP_RUNTIME) continue;
                console.log(ope);
                EXIT_HERE;
                if (ope.__value instanceof Expression) {
                    ope.type = OP_STACK;
                    const exprToInsert = ope.__value.instance();
                    const next = typeof ope.next === 'number' ? ope.next : ope.__next;
                    if (next) exprToInsert.next(next);
                    ope.offset = this.insertStack(exprToInsert, pos);
                    nextPos = false;
                    break;
                }
                if (typeof ope.__value !== 'undefined' && !(ope.__value instanceof NonRuntimeEvaluable)) continue;

                // TODO: twice evaluations, be carefull double increment evaluations,etc..
                const res = this.evaluateRuntime(ope);
                if (res.value && res.value.type === OP_ID_REF) {
                    ope.type = OP_ID_REF;
                    ope.refType = res.refType;
                    ope.id = res.id;
                } else if (res instanceof Expression) {
                    ope.type = OP_STACK;
                    const exprToInsert = res.instance();
                    const next = typeof ope.next === 'number' ? ope.next : ope.__next;
                    if (next) exprToInsert.next(next);
                    ope.offset = this.insertStack(exprToInsert, pos);
                    nextPos = false;
                    break;
                }
            }
            if (nextPos) ++pos;
        }*/
    }
        // this method instance the expression references to include them inside
    // TODO: view how these affects to optimization.
    instanceExpressions(options) {
        EXIT_HERE;
        // assert(ope.__value instanceof Expression === false);
        /*
        if (ope.__value instanceof Expression) {
            ope.type = OP_STACK;
            const exprToInsert = ope.__value.instance();
            const next = typeof ope.next === 'number' ? ope.next : ope.__next;
            if (next) exprToInsert.next(next);
            ope.offset = this.insertStack(exprToInsert, pos);
            nextPos = false;
            break;
        }
        if (typeof ope.__value !== 'undefined' && !(ope.__value instanceof NonRuntimeEvaluable)) continue;

        // TODO: twice evaluations, be carefull double increment evaluations,etc..
        const res = this.evaluateRuntime(ope);
        if (res.value && res.value.type === OP_ID_REF) {
            ope.type = OP_ID_REF;
            ope.refType = res.refType;
            ope.id = res.id;
        } else if (res instanceof Expression) {
            ope.type = OP_STACK;
            const exprToInsert = res.instance();
            const next = typeof ope.next === 'number' ? ope.next : ope.__next;
            if (next) exprToInsert.next(next);
            ope.offset = this.insertStack(exprToInsert, pos);
            nextPos = false;
            break;
        }*/
    }

    simplify() {
        let loop = 0;
        while (this.stack.length > 0) {
            let updated = false;
            for (const st of this.stack) {
                updated = this.simplifyOperation(st) || updated;
            }
            this.compactStack();
            if (!updated) break;
        }
    }

    // this method simplify trivial operations as 0 + x or 1 * x, also
    // simplify operations between values, not only direct values also
    // referenced and solved values (as runtime variable)

    simplifyOperation(st) {
        if (st.op === false || st.operands.length > 2) {
            return false;
        }

        // this.simplifyRuntimeToValue(st);
        const firstValue = st.operands[0] instanceof ExpressionItems.ValueItem ? st.operands[0].getValue() : false;
        const secondValue = (st.operands.length > 1 && st.operands[1] instanceof ExpressionItems.ValueItem) ? st.operands[1].getValue() : false;

        // [op,v1,v2] ==> [v1 op v2]
        if (firstValue !== false && secondValue !== false) {
            assert(!firstValue || !firstValue.rowOffset);
            assert(!secondValue || !secondValue.rowOffset);
            const res = this.applyOperation(st.op, st.operands);
            st.operands = [assertExpressionItem(res)];
            st.op = false;
            return true;
        }

        // [neg,value] ==> [false,-value]
        if (st.op === 'neg' && firstValue !== false) {
            assert(!firstValue.rowOffset);
            st.op = false;
            st.operands[0].setValue(-st.operands[0].getValue());
            assert(st.operands[0] instanceof ExpressionItem);
            return true;
        }

        const firstZero = firstValue === 0n;

        if (firstZero || secondValue === 0n) {
            // [mul, 0, x] ==> [0]
            // [mul, x, 0] ==> [0]
            if (st.op === 'mul') {
                st.op = false;
                st.operands = [st.operands[firstZero ? 0:1]];
                return true;
            }
            // [add, 0, x] ==> [x]
            // [add, x, 0] ==> [x]
            if (st.op === 'add') {
                st.op = false;
                st.operands = [st.operands[firstZero ? 1:0]];
                return true;
            }

            // [sub, x, 0] ==> [x]
            if (st.op === 'sub' && !firstZero) {
                st.op = false;
                return true;
            }
        }

        const firstOne = firstValue === 1n;

        // [mul, 1, x] ==> [x]
        // [mul, x, 1] ==> [x]
        if (st.op === 'mul' && (firstOne || secondValue === 1n)) {
            st.op = false;
            st.operands = [st.operands[firstOne ? 1:0]];
            return true;
        }

        // TODO: be carrefull with next, prior, inc, dec
        // x - x = 0 ???
        // (x - (- y)) = x + y
        // (x + (- y)) = x - y
        // v1 * x + v2 * x = (v1+v2) * x
        // v1 * x - v2 * x = (v1-v2) * x

        // TODO: binary cols optimizations, each kind of optimization has a key to enable/disable
        // this specific optimization.
        // BC(y) ==> y * x + (1 - y) * z = y * (z - x) + x


        // TODO: evaluate all expressions with different prime values (valid values as binary constraints 🤔)
        // detect same expressions (as bigints or as fe, bigints same implies fe same 🤔).
        // After, check matchs with other 100% sure method.

        return false;
    }

    // this method compact stack positions with one element where operation
    // was false, replace reference of this stack operation by directly value
    compactStack() {
        let translate = [];
        let stackIndex = 0;
        let stackLen = this.stack.length;
        for (let istack = 0; istack < stackLen; ++istack) {
            const st = this.stack[istack];
            if (st.op === false) {
                const ope = st.operands[0];
                // two situations, for alone stack reference, use its reference and it must
                // be purged
                translate[istack] = ope instanceof ExpressionItems.StackItem ? [true, translate[ope.getAbsolutePos(istack)][1]] : [true, istack];
                continue;
            }

            translate[istack] = [false, stackIndex++];

            // foreach operand if it's a stack reference, must be replaced by
            // new reference or by copy of reference if it was alone (no operation)
            for (let iope = 0; iope < st.operands.length; ++iope) {
                if ((st.operands[iope] instanceof ExpressionItems.StackItem) === false) continue;
                const absolutePos = st.operands[iope].getAbsolutePos(istack);
                const [purge, newAbsolutePos] = translate[absolutePos];
                assert(absolutePos < istack);
                if (purge && this.stack[newAbsolutePos].op === false) {
                    // if purge and referenced position was alone, it is copied (duplicated)
                    this.stack[istack].operands[iope] = assertExpressionItem(this.stack[newAbsolutePos].operands[0].clone());
                } else {
                    // stackIndex - 1 is new really istack after clear simplified stack positions
                    // calculate relative position (offset)
                    const newOffset = (stackIndex - 1) - newAbsolutePos;
                    assert(newOffset > 0);
                    this.stack[istack].operands[iope].setOffset(newOffset);
                }
            }

        }
        // DEBUG:
        // translate.forEach((value, index) => console.log(`#${index} => ${value}`));

        // move stackpositions to definitive positions, from end to begin to avoid
        // overwriting, updating last position used to remove rest of stack positions
        let lastPosUsed = false;
        for (let istack = 0; istack < stackLen; ++istack) {
            const [purge, absoluteNewPos] = translate[istack];
            if (purge) continue;

            this.stack[absoluteNewPos] = this.stack[istack];
            lastPosUsed = absoluteNewPos;
        }
        if (lastPosUsed !== false) {
            this.stack.splice(lastPosUsed + 1);
        } else {
            // all stack positions must be removed, but at least need position #0
            this.stack.splice(1);
        }

        // return if expression was updated
        return stackLen > this.stack.length;
    }
    getCaller(stackLevels = 4) {
        let caller = '';
        try {
            throw new Error();
        } catch (e) {
            caller = e.stack.split('\n')[stackLevels].trim().substring(3);
        }
        return caller;
    }
    static dumpScope = null;
    dump(title) {
        const previousDumpScope = Expression.dumpScope;
        Expression.dumpScope = Expression.dumpScope === null ? '' : Expression.dumpScope + '    ';
        const res = this.dumpStack(`DUMP (${title ?? ''})`, this.stack);
        Expression.dumpScope = previousDumpScope;
        return res;
    }
    dumpItem(options) {
        return 'Expression('+this.toString(options)+')';
    }
    dumpStackResults(stackResults, title = '') {
        return this.dumpStack(`STACK RESULTS (${title ?? ''})`, stackResults, {stackProperty: 0, operandsProperty: 1});
    }
    dumpStack(title, stack, options = {} ) {
        title = title + ' ' + this.getCaller();
        console.log((Expression.dumpScope ?? '') + `\x1B[38;5;214m|==========> ${title} <==========|\x1B[0m`);
        for (let index = stack.length-1; index >=0; --index) {
            this.dumpStackPos(stack[index], index, options);
        }
    }
    dumpStackPos(stackPos, index = false, options = {}) {
        const stackProperty = options.stackProperty ?? 'op';
        const operandsProperty = options.operandsProperty ?? 'operands';
        const stackValue = stackPos[stackProperty];
        const operationInfo = (stackValue && typeof stackValue.dump === 'function') ? stackValue.dump() : stackValue;
        let info = (Expression.dumpScope ?? '') + `\x1B[38;5;214m#${index === false?'':index} ${stackValue}`;
        for (const operand of stackPos[operandsProperty]) {
            const operandInfo = this.dumpOperand(operand, index);
            info = info + ' [\x1B[38;5;76m' + operandInfo +'\x1B[38;5;214m]';
        }
        console.log(info+'\x1B[0m');
    }
    dumpOperand(op, pos) {
        const cType = '\x1B[38;5;76m';
        const cProp = '\x1B[38;5;250m';
        const cValue = '\x1B[38;5;40m';
        const options = {cType, cProp, cValue, pos};
        if (op instanceof ExpressionItem) {
            return op.dumpItem(options);
        }
        if (op === null) return 'null';
        EXIT_HERE;
    }
    toString(options) {
        let top = this.stack.length-1;
        if (top < 0) {
            return '(Expression => String)';
        }
        const res = this.stackPosToString(top ,0, {...options, dumpToString: true});
        return res;
    }
    stackPosToString(pos, parentOperation, options) {
        const st = this.stack[pos];
        if (typeof st === 'undefined') {
            console.log(pos);
            console.log(this.stack);
        }
        const parentPrecedence = ExpressionOperationsInfo.get(parentOperation).precedence;
        if (st.op === false) {
            return this.operandToString(st.operands[0], pos, st.op, options);
        }
        const operationInfo = ExpressionOperationsInfo.get(st.op);
        const operationLabel = operationInfo.label;
        let res;
        if (st.operands.length === 1) {
            res = operationLabel + this.operandToString(st.operands[0], pos, st.op, options);

        } else if (st.operands.length === 2) {
            res = this.operandToString(st.operands[0], pos, st.op, options) + ' ' + operationLabel + ' ' +
                  this.operandToString(st.operands[1], pos, st.op, options);
        } else {
            TODO_EXIT
        }
        if (parentPrecedence > operationInfo.precedence || (parentOperation === 'sub' && st.op !== 'mul')) {
            res = '(' + res + ')';
        }
        return res;
    }
    operandToString(ope, pos, parentOperation, options) {
        if (ope instanceof ExpressionItems.StackItem) {
            return this.stackPosToString(pos-ope.offset, parentOperation, options);
        }
        return ope.toString(options);
    }
    resolve() {
        const res = this.eval();
        if (res instanceof Expression) {
            return res.instance(true);
        }
        return res;
    }
    isEmpty() {
        return this.stack.length === 0;
    }
    asBool() {
        let value = this.eval();
        // check if empty expression
        if (this.isEmpty()) {
            return false;
        }
        assertLog((value instanceof Expression) === false, value);
        if (typeof value.asBool === 'function') {
            return value.asBool();
        }
        if (typeof value.asInt === 'function') {
            const ivalue = value.asInt();
            assert(typeof ivalue === 'bigint');
            return ivalue !== 0n;
        }
        throw new Exceptions.CannotBeCastToType('bool');
    }
    asIntItem() {
        return new ExpressionItems.IntValue(this.asInt());
    }
    asInt() {
        let value = this.eval();
        // check if empty expression
        if (this.isEmpty()) {
            return 0n;
        }
        assertLog((value instanceof Expression) === false, value);
        if (typeof value.asInt === 'function') {
            return value.asInt();
        }
        throw new Exceptions.CannotBeCastToType('int');
    }
    asIntDefault(defaultValue = false) {
        return this._asDefault(this.asInt, defaultValue);
    }
    asIntItemDefault(defaultValue = false) {
        return this._asDefault(this.asIntItem, defaultValue);
    }
    asString() {
        const value = this.eval();
        if (this.isEmpty()) {
            return '';
        }
        assert((value instanceof Expression) === false);
        if (typeof value.asString === 'function') {
            return value.asString();
        }
        throw new Exceptions.CannotBeCastToType('string');
    }
    asStringItem() {
        return new ExpressionItems.StringValue(this.asString());
    }
    asStringDefault(defaultValue = false) {
        return this._asDefault(this.asString, defaultValue);
    }
    asStringItemDefault(defaultValue = false) {
        return this._asDefault(this.asStringItem, defaultValue);
    }
    getValue() {
        return this.eval();
    }
    hasRuntimes() {
        return this.stack.some(stackPos => stackPos.operands.some(operand => operand.isRuntime()));
    }
}

ExpressionItem.registerClass('Expression', Expression);
module.exports = Expression;