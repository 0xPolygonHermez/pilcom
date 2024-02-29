const { F1Field } = require("ffjavascript");
const fs = require("fs");
const path = require("path");
const util = require('util');
var tmp = require('tmp-promise');
const Expression  = require('../../../src/expression.js');
const ExpressionItems  = require('../../../src/expression_items.js');

const deepEqualInAnyOrder = require('deep-equal-in-any-order');
const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
chai.use(deepEqualInAnyOrder);
const debugConsole = require('../../../src/debug_console.js').init();

describe("Expressions", async function () {
    this.timeout(10000000);
    const F = new F1Field(0xffffffff00000001n);

    function checkScopeDefine(scope, name, value) {
        scope.define(name, value);
        assert.equal(value, scope.get(name));
        assert.equal(true, scope.isDefined(name));
    }
    function checkScopeSet(scope, name, value) {
        scope.set(name, value);
        assert.equal(value, scope.get(name));
        assert.equal(true, scope.isDefined(name));
    }
    it("Empty expressions", async () => {
        const e1 = new Expression();
        expect(e1.asIntItem()).to.deep.equalInAnyOrder(new ExpressionItems.IntValue(0n));
        // expect(e1.asFeItem()).to.deep.equalInAnyOrder(new ExpressionItems.FeValue(0n));
        expect(e1.asStringItem()).to.deep.equalInAnyOrder(new ExpressionItems.StringValue(''));
        assert.equal(0n, e1.asInt());
        // assert.equal(0n, e1.asFe());
        assert.equal('', e1.asString());
        assert.equal(false, e1.asBool());
        expect(e1).to.deep.equalInAnyOrder(new Expression());
    })
    it("Setting as int", async () => {
        {
            const e1 = new Expression();
            e1._set(new ExpressionItems.IntValue(10n));
            expect(e1.asIntItem()).to.deep.equalInAnyOrder(new ExpressionItems.IntValue(10n));
            assert.equal(10n, e1.asInt());
            assert.equal(true, e1.asBool());
        }
        {
            const e2 = new Expression();
            e2._set(new ExpressionItems.IntValue(0n));
            expect(e2.asIntItem()).to.deep.equalInAnyOrder(new ExpressionItems.IntValue(0n));
            assert.equal(0n, e2.asInt());
            assert.equal(false, e2.asBool());
        }
    })
    it("Setting as string", async () => {
        {
            const e1 = new Expression();
            const stringExample = "Hello, world !!";
            e1._set(new ExpressionItems.StringValue(stringExample));
            expect(e1.asStringItem()).to.deep.equalInAnyOrder(new ExpressionItems.StringValue(stringExample));
            assert.equal(stringExample, e1.asString());
            assert.equal(true, e1.asBool());
        }
        {
            const e2 = new Expression();
            const emptyString = "";
            e2._set(new ExpressionItems.StringValue(emptyString));
            expect(e2.asStringItem()).to.deep.equalInAnyOrder(new ExpressionItems.StringValue(emptyString));
            assert.equal(emptyString, e2.asString());
            assert.equal(false, e2.asBool());
        }
    })
    // TODO: settinga as template
    it("Adding", async () => {
        const e1 = new Expression();
        e1._set(new ExpressionItems.IntValue(10n));
        expect(e1.asIntItem()).to.deep.equalInAnyOrder(new ExpressionItems.IntValue(10n));
        assert.equal(10n, e1.asInt());
        assert.equal(true, e1.asBool());
    })
/*
    it("Basic test", async () => {
        const F = new F1Field(0xffffffff00000001n);
        let scope = new Scope(F);

        assert.equal(false, scope.isDefined('myFirstVar'));
        scope.define('myFirstVar', 13);
        assert.equal(13, scope.get('myFirstVar'));
        assert.equal(true, scope.isDefined('myFirstVar'));
        scope.set('myFirstVar', 14);
        assert.equal(14, scope.get('myFirstVar'));
    });
    it("Scope Test", async () => {
        const F = new F1Field(0xffffffff00000001n);
        let scope = new Scope(F);

        assert.equal(false, scope.isDefined('myFirstVar'));
        scope.define('myFirstVar', 13);
        assert.equal(13, scope.get('myFirstVar'));
        assert.equal(true, scope.isDefined('myFirstVar'));
        scope.push();
        assert.equal(13, scope.get('myFirstVar'));
        assert.equal(true, scope.isDefined('myFirstVar'));
        scope.set('myFirstVar', 14);
        assert.equal(14, scope.get('myFirstVar'));
        scope.define('myFirstVar', 20);
        assert.equal(20, scope.get('myFirstVar'));
        assert.equal(true, scope.isDefined('myFirstVar'));
        scope.define('mySecondVar', 25);
        assert.equal(25, scope.get('mySecondVar'));
        assert.equal(true, scope.isDefined('mySecondVar'));
        scope.set('mySecondVar', 27);
        assert.equal(27, scope.get('mySecondVar'));
        assert.throws(
            () => scope.define('myFirstVar', 50),
            'myFirstVar already defined on this scope ....'
        );
        assert.equal(20, scope.get('myFirstVar'));
        assert.equal(true, scope.isDefined('myFirstVar'));
        scope.pop();
        assert.equal(14, scope.get('myFirstVar'));
        assert.equal(true, scope.isDefined('myFirstVar'));
    });
    it("Scope Pop destroy variables", async () => {
        const F = new F1Field(0xffffffff00000001n);
        let scope = new Scope(F);

        scope.push();
        checkScopeDefine(scope, 'mySecondVar', 25);
        checkScopeSet(scope, 'mySecondVar', 27);
        scope.pop();
        assert.equal(false, scope.isDefined('mySecondVar'));
        assert.equal(null, scope.get('mySecondVar'));
        assert.throws(
            () => scope.set('mySecondVar', 29),
            'mySecondVar not defined on this scope ....'
        );
    });*/
});