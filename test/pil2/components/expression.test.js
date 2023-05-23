const chai = require("chai");
const assert = chai.assert;
const src = __dirname + "/../../../src/";
const Expression = require(src + 'expression.js');


const toJSON = function (obj) {
    return JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v);
}

describe("Expression", async function () {
    this.timeout(10000000);

    it("Basic test", async () => {
        let e = new Expression();
        assert.equal(e.isAlone(), false);

        e.setValue(0);
        assert.equal(e.isAlone(), true);

        assert.throws(() => {e.setValue(0)}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setRuntime({name: 'mary', indexes: [1], next: 2})}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setIdReference(10, 'imC', 0, 2)}, Error, 'Set only could be used with empty stack');

        let expected = [{op: false, operands: [{type: 0, value: 0}]}];
        assert.equal(toJSON(e.stack), toJSON(expected));

        e = new Expression();

        assert.equal(e.isAlone(), false);

        e.setRuntime({name: 'joe', indexes: [5], next: 7});
        assert.equal(e.isAlone(), true);

        assert.throws(() => {e.setValue(0)}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setRuntime({name: 'mary', indexes: [1], next: 2})}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setIdReference(10, 'imC', 0, 2)}, Error, 'Set only could be used with empty stack');

        expected = [{op: false, operands: [{type: 3, value: {name: 'joe', indexes: [5], next: 7}}]}];
        assert.equal(toJSON(e.stack), toJSON(expected));

        e = new Expression();

        assert.equal(e.isAlone(), false);

        e.setIdReference(12, 'witness', 1, -1);
        assert.equal(e.isAlone(), true);

        assert.throws(() => {e.setValue(0)}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setRuntime({name: 'mary', indexes: [1], next: 2})}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setIdReference(10, 'imC', 0, 2)}, Error, 'Set only could be used with empty stack');

        expected = [{op: false, operands: [{type:1, id: 12, refType: 'witness', offset: 1, next: -1}]}];
        assert.equal(toJSON(e.stack), toJSON(expected));
    });

    it("Insert test", async () => {
        let a = new Expression();
        assert.equal(a.isAlone(), false);

        a.setValue(10);
        assert.equal(a.isAlone(), true);

        let b = new Expression();
        b.setValue(20);

        a.insert('+', b);
        let expected = [{op:'+',operands:[{type:0, value: 10},{type:0, value: 20}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));

        b.stack[0].operands[0].value = 30;
        assert.equal(toJSON(a.stack), toJSON(expected));

        a.insert('*', b);
        expected = [...expected, {op:'*',operands:[{type:2, offset:1},{type:0, value: 30}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));

        a.insert('-', a);
        let count = expected.length;
        expected = [...expected, ...expected, {op:'-',operands:[{type:2, offset:count+1},{type:2, offset: 1}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));
    });
    it("Direct insert test", async () => {
        let a = new Expression();
        a.setValue(10);

        let b = new Expression();
        b.setValue(20);

        let c = new Expression();
        c.insert('+', a, b);
        let expected = [{op:'+',operands:[{type:0, value:10},{type:0, value: 20}]}];
        assert.equal(toJSON(c.stack), toJSON(expected));

        b.stack[0].operands[0].value = 30;
        assert.equal(toJSON(c.stack), toJSON(expected));

        c.insert('*', b);
        expected = [...expected, {op:'*',operands:[{type:2, offset:1},{type:0, value: 30}]}];
        assert.equal(toJSON(c.stack), toJSON(expected));

        c.insert('-', c);
        let count = expected.length;
        expected = [...expected, ...expected, {op:'-',operands:[{type:2, offset:count+1},{type:2, offset: 1}]}];
        assert.equal(toJSON(c.stack), toJSON(expected));

        d = new Expression();
        d.insert('neg', a);
        expected = [{op:'neg',operands:[{type:0, value:10}]}];
        assert.equal(toJSON(d.stack), toJSON(expected));
    })

    it("Multiple insert test", async () => {
        let a = new Expression();
        a.setValue(10);

        let b = new Expression();
        b.setValue(20);

        let c = new Expression();
        c.insert('+', a, b);
        let expected = [{op:'+',operands:[{type:0, value:10},{type:0, value: 20}]}];
        assert.equal(toJSON(c.stack), toJSON(expected));

        b.stack[0].operands[0].value = 30;
        assert.equal(toJSON(c.stack), toJSON(expected));

        c.insert('*', b);
        expected = [...expected, {op:'*',operands:[{type:2, offset:1},{type:0, value: 30}]}];
        assert.equal(toJSON(c.stack), toJSON(expected));

        c.insert('-', c);
        let count = expected.length;
        expected = [...expected, ...expected, {op:'-',operands:[{type:2, offset:count+1},{type:2, offset: 1}]}];
        assert.equal(toJSON(c.stack), toJSON(expected));


        let d1 = new Expression();
        d1.setRuntime({name: 'JohnSmith', indexes: [2,5,7], next: 10});

        let d2 = new Expression();
        d2.setIdReference(103, 'fe', -18746, 0);



        let d = new Expression();
        d.insert('+', d1, d2);
        let expectedD = [{op:'+',operands:[{type:3, value: {name: 'JohnSmith', indexes: [2, 5, 7], next: 10}},
                                           {type:1, id: 103, refType: 'fe', offset: -18746, next: 0}]}];
        expected = expectedD;
        assert.equal(toJSON(d.stack), toJSON(expected));

        a.insert('*', d);
        expected = [...expected, {op:'*',operands:[{type:0, value: 10},{type:2, offset: 1}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));

        a = new Expression();
        a.insert('fx', d);
        expected = [...expectedD, {op:'fx',operands:[{type:2, offset: 1}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));
    })

    it("Clone test", async () => {
        let a = new Expression();
        a.setValue(10);

        let b = new Expression();
        b.setRuntime({name: 'Joe', indexes: [2, 10, 13], next: -10});

        let c = new Expression();
        c.insert('+', a, b);
        let expected = [{op:'+',operands:[{type:0, value: 10},{type:3, value: {name: "Joe", indexes: [2, 10, 13], next: -10}}]}];
        assert.equal(toJSON(c.stack), toJSON(expected));

        b.stack[0].operands[0].value.indexes[2] = 30;
        assert.equal(toJSON(c.stack), toJSON(expected));

        b = new Expression();
        b.setIdReference(100, 'int', 180, -13);

        c.insert('*', b);
        expected = [...expected, {op:'*',operands:[{type:2, offset:1},{type:1, id: 100, refType: 'int', offset:180, next: -13}]}];
        assert.equal(toJSON(c.stack), toJSON(expected));

        d = c.clone();
        assert.equal(toJSON(d.stack), toJSON(expected));
        c.stack[0].operands[0].type = 29;
        c.stack[0].operands[1].type = 18;
        c.stack[0].op = 'xx';
        c.stack[1].operands[0].type = 56;
        c.stack[1].operands[1].type = 57;
        c.stack[1].op = 'yy';
        assert.equal(toJSON(d.stack), toJSON(expected));

        // clone himself
        d = d.clone();
        assert.equal(toJSON(d.stack), toJSON(expected));
    })

    it("Insert himself", async () => {
        let a = new Expression();
        a.setValue(10);

        a.insert('+', a, a);
        let expectedA = {op:'+',operands:[{type:0, value: 10},{type:0, value: 10},{type:0, value: 10}]};
        let expected = [expectedA];
        assert.equal(toJSON(a.stack), toJSON(expected));

        let b = new Expression();
        b.setValue(38);
        b.insert('*', a, a);
        expected = [...expected, ...expected, {op:'*',operands:[{type:0, value: 38},{type:2, offset:2},{type:2, offset:1}]}];
        assert.equal(toJSON(b.stack), toJSON(expected));

        b.insert('**', a, a);
        expected = [...expected, expectedA, expectedA, {op:'**',operands:[{type:2, offset:3},{type:2, offset:2},{type:2, offset:1}]}];
        assert.equal(toJSON(b.stack), toJSON(expected));
    })

    it("Exceptions test", async () => {
        let a = new Expression();
        a.setValue(10);
        assert.throws(() => {a.pushStack(0)}, Error, 'pushStack parameter must be an Expression');
        assert.throws(() => {a.pushStack(this)}, Error, 'pushStack parameter must be an Expression');
        assert.throws(() => {a.pushStack()}, Error, 'pushStack parameter must be an Expression');

        let b = new Expression();
        assert.throws(() => {a.insert('+', b)}, Error, 'insert without operands');

        let b2 = new Expression();
        assert.throws(() => {a.insert('+', b, b2)}, Error, 'insert without operands');
        assert.throws(() => {b2.setValue(b)}, Error, 'object(Expression) as value not allowed');
    });

    it("Unary insert", async () => {
        let a = new Expression();
        a.setValue(10);
        let expected = [{op:false, operands:[{type:0, value: 10}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));

        a.insert('not');
        expected = [{op:'not', operands:[{type:0, value: 10}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));

        a.insert('not');
        expected = [...expected, {op:'not', operands:[{type:2, offset: 1}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));
    })


});