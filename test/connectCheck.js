const chai = require("chai");
const { F1Field } = require("ffjavascript");
const assert = chai.assert;
const { compile, verifyPil, newConstantPolsArray, newCommitPolsArray, getRoots, getKs } = require("..");

describe("Connect Verification", async function () {

    this.timeout(10000000);

    it("Connect Test field goldilocks", async () => {
        const F = new F1Field(0xffffffff00000001n);

        const pil = await compile(F,
            `constant %N = 4;
             namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             namespace ConnectExample(%N);
             pol constant A, B, C;
             pol commit a, b, c;
             {a,b,c} connect {A,B,C};
            `, null,
            { compileFromString: true });

        let constPols = newConstantPolsArray(pil, F);
        let cmPols = newCommitPolsArray(pil, F);

        const N = 4;
        const pow = 2;

        const ks = getKs(F, 2);
        const roots = getRoots(F);
        const wi = roots[pow];
        let w = F.one;
        for (let i=0; i<N; i++) {
            constPols.ConnectExample.A[i] = w;
            constPols.ConnectExample.B[i] = F.mul(w, ks[0]);
            constPols.ConnectExample.C[i] = F.mul(w, ks[1]);
            w = F.mul(w, wi);
        }

        function connect(p1, i1, p2, i2) {
            [p1[i1], p2[i2]] = [p2[i2], p1[i1]];
        }

        const L1 = [1,0,0,0];
        const a = [2,6,5,5];
        const b = [5,1,2,3];
        const c = [1,3,6,1];
        for (i = 0; i<4; ++i) {
            constPols.Global.L1[i] = BigInt(L1[i]);
            cmPols.ConnectExample.a[i] = BigInt(a[i]);
            cmPols.ConnectExample.b[i] = BigInt(b[i]);
            cmPols.ConnectExample.c[i] = BigInt(c[i]);
        }
        connect(constPols.ConnectExample.A, 0, constPols.ConnectExample.B, 2);
        connect(constPols.ConnectExample.A, 1, constPols.ConnectExample.C, 2);
        connect(constPols.ConnectExample.B, 0, constPols.ConnectExample.A, 2);
        connect(constPols.ConnectExample.B, 0, constPols.ConnectExample.A, 3);
        connect(constPols.ConnectExample.C, 1, constPols.ConnectExample.B, 3);
        const res = await verifyPil(F, pil, cmPols, constPols);
        assert(res.length === 0);
    });

    it("Connect Test field bn128", async () => {
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

        const pil = await compile(F,
            `constant %N = 4;
             namespace Global(%N);
             pol constant L1;    // 1, 0, 0, 0, 0
             namespace ConnectExample(%N);
             pol constant A, B, C;
             pol commit a, b, c;
             {a,b,c} connect {A,B,C};
            `, null,
            { compileFromString: true });

        let constPols = newConstantPolsArray(pil, F);
        let cmPols = newCommitPolsArray(pil, F);

        const N = 4;
        const pow = 2;

        const ks = getKs(F, 2);
        const wi = F.w[pow];
        let w = F.one;
        for (let i=0; i<N; i++) {
            constPols.ConnectExample.A[i] = w;
            constPols.ConnectExample.B[i] = F.mul(w, ks[0]);
            constPols.ConnectExample.C[i] = F.mul(w, ks[1]);
            w = F.mul(w, wi);
        }

        function connect(p1, i1, p2, i2) {
            [p1[i1], p2[i2]] = [p2[i2], p1[i1]];
        }

        const L1 = [1,0,0,0];
        const a = [2,6,5,5];
        const b = [5,1,2,3];
        const c = [1,3,6,1];
        for (i = 0; i<4; ++i) {
            constPols.Global.L1[i] = BigInt(L1[i]);
            cmPols.ConnectExample.a[i] = BigInt(a[i]);
            cmPols.ConnectExample.b[i] = BigInt(b[i]);
            cmPols.ConnectExample.c[i] = BigInt(c[i]);
        }
        connect(constPols.ConnectExample.A, 0, constPols.ConnectExample.B, 2);
        connect(constPols.ConnectExample.A, 1, constPols.ConnectExample.C, 2);
        connect(constPols.ConnectExample.B, 0, constPols.ConnectExample.A, 2);
        connect(constPols.ConnectExample.B, 0, constPols.ConnectExample.A, 3);
        connect(constPols.ConnectExample.C, 1, constPols.ConnectExample.B, 3);
        const res = await verifyPil(F, pil, cmPols, constPols);
    });

});
