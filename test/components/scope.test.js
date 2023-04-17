const chai = require("chai");
const { F1Field } = require("ffjavascript");
const fs = require("fs");
const path = require("path");
const assert = chai.assert;
var tmp = require('tmp-promise');
const Scope  = require('../../src/scope.js');

describe("Scope", async function () {
    this.timeout(10000000);

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
    });
});