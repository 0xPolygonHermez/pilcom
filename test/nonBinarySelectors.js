const chai = require("chai");
const { exec } = require("child_process");
const { F1Field } = require("ffjavascript");
const fs = require("fs");
const path = require("path");
const assert = chai.assert;
const { execSync } = require('child_process');
var tmp = require('tmp-promise');
const { compile, verifyPil, newConstantPolsArray, newCommitPolsArray } = require("..");

const commonTestCode = async function (F, name, specificPilProgram, values) {
        const pilProgram =    `constant %N = 4;
                            namespace Global(%N);
                            pol constant L1;    // 1, 0, 0, 0, 0
                            namespace Example(%N);
                            ` + specificPilProgram;

        const pil = await compile(F, pilProgram, null, { compileFromString: true });

        fs.writeFileSync(`tmp/${name}.pil`, pilProgram);
        fs.writeFileSync(`tmp/${name}.pil.json`, JSON.stringify(pil));

        let constPols = newConstantPolsArray(pil);
        let cmPols = newCommitPolsArray(pil);
        const L1 = [1,0,0,0];

        for (i = 0; i<4; ++i) {
            constPols.Global.L1[i] = BigInt(L1[i]);
            for (const polname in values) {
                if (typeof (constPols.Example ?? {})[polname] != 'undefined')   {
                    constPols.Example[polname][i] = BigInt(values[polname][i]);
                }
                if (typeof (cmPols.Example ?? {})[polname] != 'undefined') {
                    cmPols.Example[polname][i] = BigInt(values[polname][i]);
                }
            }
        }
        await constPols.saveToFile(`tmp/${name}.const`);
        await cmPols.saveToFile(`tmp/${name}.commit`);
        return await verifyPil(F, pil, cmPols, constPols);
}

describe("Plookup and permutation selectors value Test", async function () {

    const F = new F1Field(0xffffffff00000001n);
    this.timeout(10000000);

    // Plookups

    it("Test (plookup - selector - values included)", async () => {
        const res = await commonTestCode(F, 'non-binary-plookup-selectors-values-included',
           `pol constant b1,b2;
            pol commit a1, a2;
            b1{a1} in b2{a2};
        `,
        {   b1: [0,5,0,0],
            b2: [5,0,0,0],
            a1: [4,2,3,21],
            a2: [2,6,19,7] });
        assert.equal('', res.join(''));
    });

    it("ZKEV-14 Test (plookup - selector - value not included)", async () => {
        const res = await commonTestCode(F, 'non-binary-plookup-selectors-values-not-included',
           `pol constant b1,b2;
            pol commit a1, a2;
            b1{a1} in b2{a2};
        `,
        {   b1: [0,5,0,0],
            b2: [6,0,0,0],
            a1: [4,2,3,21],
            a2: [2,6,19,7] });
        assert.equal("(string):7:  plookup not found w=1 values: 5:2", res);
    });

    it("Test (plookup - wo selector - values included)", async () => {
        const res = await commonTestCode(F, 'non-binary-plookup-wo-selectors-values-included',
           `pol commit a1, a2;
            a1 in a2;
        `,
        {   a1: [4,2,4,4],
            a2: [1,2,3,4] });
        assert.equal('', res.join(''));
    });

    it("Test (plookup - wo selector - value not included)", async () => {
        const res = await commonTestCode(F, 'non-binary-plookup-wo-selectors-value-not-included',
           `pol commit a1, a2;
            a1 in a2;
        `,
        {   a1: [4,2,4,4],
            a2: [1,3,4,4] });
        assert.equal("(string):6:  plookup not found w=1 values: 1:2", res);
    });

    // Permutation Checks

    it("Test (permutation - selector - values included)", async () => {
        const res = await commonTestCode(F, 'non-binary-permutation-selectors-values-included',
           `pol constant b1,b2;
            pol commit a1, a2;
            b1{a1} is b2{a2};
        `,
        {   b1: [0,5,0,0],
            b2: [5,0,0,0],
            a1: [4,2,3,21],
            a2: [2,6,19,7] });
        assert.equal('', res.join(''));
    });

    it("ZKEV-14 Test (permutation - selector - value not included)", async () => {
        const res = await commonTestCode(F, 'non-binary-permutation-selectors-values-not-included',
           `pol constant b1,b2;
            pol commit a1, a2;
            b1{a1} is b2{a2};
        `,
        {   b1: [0,5,0,0],
            b2: [6,0,0,0],
            a1: [4,2,3,21],
            a2: [2,6,19,7] });
        assert.equal("(string):7:  permutation not found w=1 values: 5:2", res);
    });

    it("Test (permutation - wo selector - values included)", async () => {
        const res = await commonTestCode(F, 'non-binary-permutation-wo-selectors-values-included',
           `pol commit a1, a2;
            a1 is a2;
        `,
        {   a1: [4,2,3,1],
            a2: [1,2,3,4] });
        assert.equal('', res.join(''));
    });

    it("Test (permutation - wo selector - value not included)", async () => {
        const res = await commonTestCode(F, 'non-binary-permutation-wo-selectors-value-not-included',
           `pol commit a1, a2;
            a1 is a2;
        `,
        {   a1: [4,2,4,4],
            a2: [1,3,4,4] });
        assert.equal("(string):6:  permutation not found w=1 values: 1:2", res);
    });

    it("Test (permutation - wo selector - value not enought)", async () => {
        const res = await commonTestCode(F, 'non-binary-permutation-wo-selectors-value-not-enought',
           `pol commit a1, a2;
            a1 is a2;
        `,
        {   a1: [4,3,4,4],
            a2: [1,3,4,4] });
        assert.equal("(string):6:  permutation not enought found w=3 values: 1:4", res.join(''));
    });
});
