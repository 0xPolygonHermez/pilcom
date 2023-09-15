const chai = require("chai");
const { exec } = require("child_process");
const { F1Field } = require("ffjavascript");
const fs = require("fs");
const path = require("path");
const assert = chai.assert;
const { execSync } = require('child_process');
var tmp = require('tmp-promise');
const { compile } = require("..");


describe("CompileFromString (string compilation - library)", async function () {

    const F = new F1Field(0xffffffff00000001n);
    this.timeout(10000000);

    it("It should compile from string", async () => {

        const pil = await compile(F,
            `namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             pol constant BYTE;
            `, null,
            { compileFromString: true });

        assert.containsAllKeys(pil.references, ['Global.L1', 'Global.BYTE']);
    });

    it("It should compile from string with include without includePaths", async () => {

        const pil = await compile(F,
            `namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             pol constant BYTE;
             include "test/examples/path1/includePath.pil"
             `, null,
            { compileFromString: true });

        assert.containsAllKeys(pil.references, ['Global.L1', 'Global.BYTE', 'IncludePath.path1const']);
    });

    it("It should compile from string with include and includePaths", async () => {

        const pil = await compile(F,
            `namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             pol constant BYTE;
             include "includePath.pil"
             `, null,
            { compileFromString: true,
              includePaths: ['test/examples/path2']});

        assert.containsAllKeys(pil.references, ['Global.L1', 'Global.BYTE', 'IncludePath.path2const']);
    });
});

describe("CompileFromString (file compilation - library)", async function () {

    const F = new F1Field(0xffffffff00000001n);
    this.timeout(10000000);

    it("It should compile from file (library) with regular include", async () => {

        const pil = await compile(F, 'test/examples/mainIncludePath1.pil');
        assert.containsAllKeys(pil.references, ['MainIncludePath1.L1', 'MainIncludePath1.BYTE', 'IncludePath.path1const']);
    });

    it("It should compile from file (library) with regular include with includePathFirst=true", async () => {

        const pil = await compile(F, 'test/examples/mainIncludePath1.pil', null, {includePathFirst: true});
        assert.containsAllKeys(pil.references, ['MainIncludePath1.L1', 'MainIncludePath1.BYTE', 'IncludePath.path1const']);
    });

    it("It should compile from file (library) with includePaths", async () => {

        const pil = await compile(F,'test/examples/mainIncludePath2.pil', null,
            { includePaths: ['test/examples/path2']});

        assert.containsAllKeys(pil.references, ['MainIncludePath2.L1', 'MainIncludePath2.BYTE', 'IncludePath.pathconst']);
    });

    it("It should compile from file (library) with includePaths with includePathFirst=true", async () => {

        const pil = await compile(F,'test/examples/mainIncludePath2.pil', null,
            { includePaths: ['test/examples/path1'], includePathFirst: true});

        assert.containsAllKeys(pil.references, ['MainIncludePath2.L1', 'MainIncludePath2.BYTE', 'IncludePath.path1const']);
    });
});

describe("CompileFromString (file compilation - cmdline)", async function () {

    const F = new F1Field(0xffffffff00000001n);
    const output = '/tmp/CompileFromStringTest2.pil.json';
    this.timeout(10000000);

    it("It should compile from file (cmdline) with regular include", async () => {
        execSync(`src/pil.js test/examples/mainIncludePath1.pil -o ${output}`);
        const pil = JSON.parse(fs.readFileSync(output));
        assert.containsAllKeys(pil.references, ['MainIncludePath1.L1', 'MainIncludePath1.BYTE', 'IncludePath.path1const']);
    });

    it("It should compile from file (cmdline) with regular include with includePathFirst=true", async () => {
        execSync(`src/pil.js test/examples/mainIncludePath1.pil -f -o ${output}`);
        const pil = JSON.parse(fs.readFileSync(output));
        assert.containsAllKeys(pil.references, ['MainIncludePath1.L1', 'MainIncludePath1.BYTE', 'IncludePath.path1const']);
    });

    it("It should compile from file (cmdline) with includePaths", async () => {
        execSync(`src/pil.js test/examples/mainIncludePath2.pil -I test/examples/path2 -o ${output}`);
        const pil = JSON.parse(fs.readFileSync(output));
        assert.containsAllKeys(pil.references, ['MainIncludePath2.L1', 'MainIncludePath2.BYTE', 'IncludePath.pathconst']);
    });

    it("It should compile from file (cmdline) with includePaths with includePathFirst=true", async () => {
        execSync(`src/pil.js test/examples/mainIncludePath2.pil -f -I test/examples/path1 -o ${output}`);
        const pil = JSON.parse(fs.readFileSync(output));
        assert.containsAllKeys(pil.references, ['MainIncludePath2.L1', 'MainIncludePath2.BYTE', 'IncludePath.path1const']);
    });

    beforeEach(() => {
        if (fs.existsSync(output, fs.constants.W_OK | fs.constants.R_OK)) fs.unlinkSync(output);
    });
});
