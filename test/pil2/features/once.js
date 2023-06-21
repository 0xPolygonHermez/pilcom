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
        constraints.processor = await compile(F, __dirname + "/once.pil", null, { processorTest: true });

        constraints.it = constraints.processor.constraints[Symbol.iterator]();

        verifyNextConstraint('c1 - 314','witness@0 - 314');

        verifyNextConstraint('(c2 + c1) - 14','(witness@1 + witness@0) - 14');

        verifyNextConstraint('(c2 + c1) - 66','(witness@1 + witness@0) - 66');
        verifyNextConstraint('(c2 + c1) - 88','(witness@1 + witness@0) - 88');

        verifyNextConstraint('(c2 + c1) - 12','(witness@1 + witness@0) - 12');
        verifyNextConstraint('(c2 + c1) - 15','(witness@1 + witness@0) - 15');
        verifyNextConstraint('(c2 + c1) - 18','(witness@1 + witness@0) - 18');
        verifyNextConstraint('(c2 + c1) - 20','(witness@1 + witness@0) - 20');
        verifyNextConstraint('(c2 + c1) - 24','(witness@1 + witness@0) - 24');

        verifyNextConstraint('c2 - 130','witness@1 - 130');
        assert.strictEqual(constraints.it.next().done, true);
    });

});
