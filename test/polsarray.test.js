const chai = require("chai");
const { F1Field } = require("ffjavascript");
const fs = require("fs");
const path = require("path");
const assert = chai.assert;
var tmp = require('tmp-promise');
const { compile, newConstantPolsArray, newCommitPolsArray } = require("..");


describe("PolsArray", async function () {
    this.timeout(10000000);

    it("It should create, save and rescover pols Array", async () => {
        const F = new F1Field(0xffffffff00000001n);

        const pil = await compile(F, path.join(__dirname, "examples", "arrays.pil"));

        const constPols = newConstantPolsArray(pil);
        const cmPols = newCommitPolsArray(pil);

        let p=1n;
        for (let i=0; i<constPols.$$n; i++) {
            constPols.Arrays2.d[0][i] = BigInt(p++);
            constPols.Arrays2.d[1][i] = BigInt(p++);
            cmPols.Arrays2.c[i] = BigInt(p++);
            cmPols.Arrays1.a[i] = BigInt(p++);
            cmPols.Arrays1.b[0][i] = BigInt(p++);
            cmPols.Arrays1.b[1][i] = BigInt(p++);
            cmPols.Arrays1.b[2][i] = BigInt(p++);
            cmPols.Arrays1.c[i] = BigInt(p++);
        }

        fileNameConst = await tmp.tmpName();
        fileNameCm = await tmp.tmpName();
        await constPols.saveToFile(fileNameConst);
        await cmPols.saveToFile(fileNameCm);

        const buff2 = new BigInt64Array(constPols.$$n*constPols.$$nPols + cmPols.$$n*cmPols.$$nPols);

        const constPols2 = newConstantPolsArray(pil, buff2, 0);
        const cmPols2 = newCommitPolsArray(pil, buff2, constPols.$$n*constPols.$$nPols*8);
        await constPols2.loadFromFile(fileNameConst);
        await cmPols2.loadFromFile(fileNameCm);

        assert.equal(constPols.$$n, constPols2.$$n);
        assert.equal(constPols.$$nPols, constPols2.$$nPols);

        for (let i=0; i<constPols2.$$n; i++) {
            assert.equal(constPols.Arrays2.d[0][i], constPols2.Arrays2.d[0][i]);
            assert.equal(constPols.Arrays2.d[1][i], constPols2.Arrays2.d[1][i]);
            assert.equal(cmPols.Arrays2.c[i], cmPols2.Arrays2.c[i]);
            assert.equal(cmPols.Arrays1.a[i], cmPols2.Arrays1.a[i]);
            assert.equal(cmPols.Arrays1.b[0][i], cmPols2.Arrays1.b[0][i]);
            assert.equal(cmPols.Arrays1.b[1][i], cmPols2.Arrays1.b[1][i]);
            assert.equal(cmPols.Arrays1.b[2][i], cmPols2.Arrays1.b[2][i]);
            assert.equal(cmPols.Arrays1.c[i], cmPols2.Arrays1.c[i]);
        }
        for (let i=0; i<constPols2.$$n; i++) {
            for (let j=0; j<constPols2.$$nPols; j++) {
                assert.equal(constPols.$$array[j][i], constPols2.$$array[j][i])
            }
            for (let j=0; j<cmPols2.$$nPols; j++) {
                assert.equal(cmPols.$$array[j][i], cmPols2.$$array[j][i])
            }
        }

        await fs.promises.unlink(fileNameConst);
        await fs.promises.unlink(fileNameCm);
    });
});