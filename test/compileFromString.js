const chai = require("chai");
const { F1Field } = require("ffjavascript");
const fs = require("fs");
const path = require("path");
const assert = chai.assert;
var tmp = require('tmp-promise');
const { compile, newConstantPolsArray, newCommitPolsArray } = require("..");


describe("CompileFromString", async function () {
    this.timeout(10000000);

    it("It should compile from string", async () => {
        const F = new F1Field(0xffffffff00000001n);

        const pil = await compile(F,
            `namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             pol constant BYTE;
            `, null,
            { compileFromString: true });

        assert.containsAllKeys(pil.references, ['Global.L1', 'Global.BYTE']);
        return false;
    });
    it("It should compile from string with include without includePaths", async () => {
        const F = new F1Field(0xffffffff00000001n);

        const pil = await compile(F,
            `namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             pol constant BYTE;
             include "test/examples/path1/includePath.pil"
             `, null,
            { compileFromString: true });

        assert.containsAllKeys(pil.references, ['Global.L1', 'Global.BYTE', 'IncludePath.path1const']);
        return false;
    });
    it("It should compile from string with include and includePaths", async () => {
        const F = new F1Field(0xffffffff00000001n);

        const pil = await compile(F,
            `namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             pol constant BYTE;
             include "includePath.pil"
             `, null,
            { compileFromString: true,
              includePaths: ['test/examples/path2']});

        assert.containsAllKeys(pil.references, ['Global.L1', 'Global.BYTE', 'IncludePath.path2const']);
        return false;
    });
    it("It should compile from file with regular include", async () => {
        const F = new F1Field(0xffffffff00000001n);

        const pil = await compile(F, 'test/examples/mainIncludePath1.pil');
        assert.containsAllKeys(pil.references, ['MainIncludePath1.L1', 'MainIncludePath1.BYTE', 'IncludePath.path1const']);
        return false;
    });
    it("It should compile from file with includePaths", async () => {
        const F = new F1Field(0xffffffff00000001n);

        const pil = await compile(F,'test/examples/mainIncludePath2.pil', null,
            { includePaths: ['test/examples/path2']});

        assert.containsAllKeys(pil.references, ['MainIncludePath2.L1', 'MainIncludePath2.BYTE', 'IncludePath.path2const']);
        return false;
    });
});