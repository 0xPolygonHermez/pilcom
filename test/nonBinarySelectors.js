const chai = require("chai");
const { exec } = require("child_process");
const { F1Field } = require("ffjavascript");
const fs = require("fs");
const path = require("path");
const assert = chai.assert;
const { execSync } = require('child_process');
var tmp = require('tmp-promise');
const { compile, verifyPil, newConstantPolsArray, newCommitPolsArray } = require("..");


describe("Plookup and permutation selectors value Test", async function () {

    const F = new F1Field(0xffffffff00000001n);
    this.timeout(10000000);

    it("ZKEV-14 Test (plookup)", async () => {

        const pil = await compile(F,
            `constant %N = 4;
             namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             namespace PermutationExample(%N);
             pol constant b1,b2;
             pol commit a1, a2;
             b1{a1} in b2{a2};
            `, null,
            { compileFromString: true });

        let constPols = newConstantPolsArray(pil);
        let cmPols = newCommitPolsArray(pil);
        const L1 = [1,0,0,0];
        const b1 = [0,5,0,0];
        const b2 = [6,0,0,0];
        const a1 = [4,2,3,21];
        const a2 = [2,6,19,7];
        for (i = 0; i<4; ++i) {
            constPols.Global.L1[i] = BigInt(L1[i]);
            constPols.PermutationExample.b1[i] = BigInt(b1[i]);
            constPols.PermutationExample.b2[i] = BigInt(b2[i]);
            cmPols.PermutationExample.a1[i] = BigInt(a1[i]);
            cmPols.PermutationExample.a2[i] = BigInt(a2[i]);
        }
        const res = await verifyPil(F, pil, cmPols, constPols);
        assert.equal(res, "(string):7:  plookup not found w=1 values: 5:2");
    });

    it("ZKEV-14 Test (permutation check)", async () => {

        const pil = await compile(F,
            `constant %N = 4;
             namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             namespace PermutationExample(%N);
             pol constant b1,b2;
             pol commit a1, a2;
             b1{a1} is b2{a2};
            `, null,
            { compileFromString: true });

        let constPols = newConstantPolsArray(pil);
        let cmPols = newCommitPolsArray(pil);
        const L1 = [1,0,0,0];
        const b1 = [0,5,0,0];
        const b2 = [6,0,0,0];
        const a1 = [4,2,3,21];
        const a2 = [2,6,19,7];
        for (i = 0; i<4; ++i) {
            constPols.Global.L1[i] = BigInt(L1[i]);
            constPols.PermutationExample.b1[i] = BigInt(b1[i]);
            constPols.PermutationExample.b2[i] = BigInt(b2[i]);
            cmPols.PermutationExample.a1[i] = BigInt(a1[i]);
            cmPols.PermutationExample.a2[i] = BigInt(a2[i]);
        }
        const res = await verifyPil(F, pil, cmPols, constPols);
        assert.equal(res, "(string):7:  permutation not found w=1 values: 5:2");
        // assert.containsAllKeys(pil.references, ['Global.L1', 'Global.BYTE']);
    });

});
