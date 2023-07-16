const chai = require("chai");
const { F1Field } = require("ffjavascript");
const assert = chai.assert;
const { compile, verifyPil } = require("../../..");

const constraints = {
    processor: null,
    it: null
};

const verifyNextConstraint = function (sconstraint, rconstraint) {

    console.log(constraints.processor.constraints);
    let c = constraints.it.next().value;
    const expr = constraints.processor.constraints.getExpr(c.exprId);
    const _sconstraint = expr.toString({hideClass: true});
    assert.equal(_sconstraint, sconstraint);
    const _rconstraint = expr.toString({hideClass: true, hideLabel: true});
    assert.equal(_rconstraint, rconstraint);
}

describe("References", async function () {

    const F = new F1Field(0xffffffff00000001n);
    this.timeout(10000000);

    it("Sequence Base Test", async () => {
        constraints.processor = await compile(F, __dirname + "/reference.pil", null, { processorTest: true });

        constraints.it = constraints.processor.constraints[Symbol.iterator]();

        verifyNextConstraint('x - 64','witness@0 - 64');
        verifyNextConstraint('y - 16','witness@1 - 16');

        verifyNextConstraint('y - 31','witness@1 - 31');
        verifyNextConstraint('z - 31','witness@2 - 31');

        verifyNextConstraint('y - 20','witness@1 - 20');
        verifyNextConstraint('z - 20','witness@2 - 20');
        verifyNextConstraint('w[0] - 20','witness@3 - 20');

        verifyNextConstraint('y - 32','witness@1 - 32');
        verifyNextConstraint('z - 32','witness@2 - 32');
        verifyNextConstraint('w[0] - 32','witness@3 - 32');
        verifyNextConstraint('w[1] - 32','witness@4 - 32');
        verifyNextConstraint('w[2] - 32','witness@5 - 32');
        verifyNextConstraint('w[3] - 32','witness@6 - 32');

        // w2[5][10] ids = 7...56

        // for (col &p in [w2[0],w2[4]]) {
        //     p[1] === 33;
        // }

        verifyNextConstraint('w2[0][1] - 33','witness@8 - 33');
        verifyNextConstraint('w2[4][1] - 33','witness@48 - 33');

        // for (col &p in [y,z,...w]) {
        //    p === 37;
        // }

        verifyNextConstraint('y - 37','witness@1 - 37');
        verifyNextConstraint('z - 37','witness@2 - 37');
        verifyNextConstraint('w[0] - 37','witness@3 - 37');
        verifyNextConstraint('w[1] - 37','witness@4 - 37');
        verifyNextConstraint('w[2] - 37','witness@5 - 37');
        verifyNextConstraint('w[3] - 37','witness@6 - 37');

        // for (col &p in [...w2]) {
        //     p[4] === 35;
        // }

        verifyNextConstraint('w2[0][4] - 35','witness@11 - 35');
        verifyNextConstraint('w2[1][4] - 35','witness@21 - 35');
        verifyNextConstraint('w2[2][4] - 35','witness@31 - 35');
        verifyNextConstraint('w2[3][4] - 35','witness@41 - 35');
        verifyNextConstraint('w2[4][4] - 35','witness@51 - 35');


        // for (col &p in [y,z,w[i0],w[i1],w[i2],w[i3]]) {
        //     p === 34;
        // }

        verifyNextConstraint('y - 34','witness@1 - 34');
        verifyNextConstraint('z - 34','witness@2 - 34');
        verifyNextConstraint('w[0] - 34','witness@3 - 34');
        verifyNextConstraint('w[1] - 34','witness@4 - 34');
        verifyNextConstraint('w[2] - 34','witness@5 - 34');
        verifyNextConstraint('w[3] - 34','witness@6 - 34');

        // int i = 0;
        // for (col &p in [y,z,w[i++],w[i++],w[i++],w[i++]]) {
        //     p === 300;
        // }

        verifyNextConstraint('y - 300','witness@1 - 300');
        verifyNextConstraint('z - 300','witness@2 - 300');
        verifyNextConstraint('w[0] - 300','witness@3 - 300');
        verifyNextConstraint('w[1] - 300','witness@4 - 300');
        verifyNextConstraint('w[2] - 300','witness@5 - 300');
        verifyNextConstraint('w[3] - 300','witness@6 - 300');

        verifyNextConstraint('y - 4','witness@1 - 4');

        assert.strictEqual(constraints.it.next().done, true);
    });

});
