const chai = require("chai");
const { F1Field } = require("ffjavascript");
const assert = chai.assert;
const { compile, verifyPil } = require("../../..");

const constraints = {
    processor: null,
    it: null
};

const verifyNextConstraint = function (sconstraint, rconstraint) {
    // console.log(sconstraint + ' ==> ' + rconstraint);
    let c = constraints.it.next().value;
    const expr = constraints.processor.constraints.getExpr(c.exprId);
    const _sconstraint = expr.toString({hideClass: true});
    assert.equal(_sconstraint, sconstraint);
    const _rconstraint = expr.toString({hideClass: true, hideLabel: true});
    assert.equal(_rconstraint, rconstraint);
}

describe("Functions", async function () {

    const F = new F1Field(0xffffffff00000001n);
    this.timeout(10000000);

    it("Functions Base Test", async () => {
        constraints.processor = await compile(F, __dirname + "/functions_cols.pil", null, { processorTest: true });

        constraints.it = constraints.processor.constraints[Symbol.iterator]();

        verifyNextConstraint('c1 - 314','witness@0 - 314');
        verifyNextConstraint('c2 - 314','witness@1 - 314');
        verifyNextConstraint('vec[3] - 314','witness@5 - 314');

        verifyNextConstraint('c1 - 318','witness@0 - 318');
        verifyNextConstraint('c2 - 318','witness@1 - 318');
        verifyNextConstraint('vec[3] - 318','witness@5 - 318');

        for (let i = 0; i < 10; ++i) {
            verifyNextConstraint(`vec[${i}] - 31416`,`witness@${i+2} - 31416`);
        }

        for (let i = 0; i < 4; ++i) {
            for (let j = 0; j < 3; ++j) {
                verifyNextConstraint(`m[${i}][${j}] - 3113`,`witness@${i*3+j+12} - 3113`);
            }
        }

        for (let i = 0; i < 10; ++i) {
            verifyNextConstraint(`vec[${i}] - 300`,`witness@${i+2} - 300`);
        }

        for (let i = 0; i < 10; ++i) {
            verifyNextConstraint(`vec[${i}] - 301`,`witness@${i+2} - 301`);
        }

        for (let i = 0; i < 10; ++i) {
            verifyNextConstraint(`vec[${i}] - 31415`,`witness@${i+2} - 31415`);
        }
        assert.strictEqual(constraints.it.next().done, true);
    });

});
