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
        assert.throws(() => {e.setNameReference('mary', [1], 2)}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setIdReference(10, 'imC', 0, 2)}, Error, 'Set only could be used with empty stack');

        assert.equal(toJSON(e.stack), '[{"op":false,"operands":[{"type":0,"value":"0"}]}]');

        e = new Expression();

        assert.equal(e.isAlone(), false);

        e.setNameReference('joe', [5], 7);
        assert.equal(e.isAlone(), true);

        assert.throws(() => {e.setValue(0)}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setNameReference('mary', [1], 2)}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setIdReference(10, 'imC', 0, 2)}, Error, 'Set only could be used with empty stack');

        assert.equal(toJSON(e.stack), '[{"op":false,"operands":[{"type":1,"name":"joe","indexes":[5],"next":7}]}]');

        e = new Expression();

        assert.equal(e.isAlone(), false);

        e.setIdReference(12, 'witness', 1, -1);
        assert.equal(e.isAlone(), true);

        assert.throws(() => {e.setValue(0)}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setNameReference('mary', [1], 2)}, Error, 'Set only could be used with empty stack');
        assert.throws(() => {e.setIdReference(10, 'imC', 0, 2)}, Error, 'Set only could be used with empty stack');

        assert.equal(toJSON(e.stack), '[{"op":false,"operands":[{"type":2,"id":12,"refType":"witness","offset":1,"next":-1}]}]');
    });

    it("Insert test", async () => {
        let a = new Expression();
        assert.equal(a.isAlone(), false);

        a.setValue(10);
        assert.equal(a.isAlone(), true);

        let b = new Expression();
        b.setValue(20);

        a.insert('+', b);
        let expected = [{op:'+',operands:[{type:0, value:10n},{type:0, value: 20n}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));

        b.stack[0].operands[0].value = 30n;
        assert.equal(toJSON(a.stack), toJSON(expected));

        a.insert('*', b);
        expected.push({op:'*',operands:[{type:3, offset:1},{type:0, value: 30n}]});
        assert.equal(toJSON(a.stack), toJSON(expected));

        a.insert('-', a);
        let count = expected.length;
        expected = [...expected, ...expected, {op:'-',operands:[{type:3, offset:count+1},{type:3, offset: 1}]}];
        assert.equal(toJSON(a.stack), toJSON(expected));
    });
});