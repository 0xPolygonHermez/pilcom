const chai = require("chai");
const { F1Field } = require("ffjavascript");
const assert = chai.assert;
const { compile, verifyPil } = require("../../..");

const constraints = {
    processor: null,
    it: null
};

const verifyNextConstraint = function (sconstraint, rconstraint) {

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
        constraints.processor = await compile(F, __dirname + "/functions.pil", null, { processorTest: true });

        constraints.it = constraints.processor.constraints[Symbol.iterator]();

        verifyNextConstraint('c1 - 2','witness@0 - 2');

        verifyNextConstraint('c1 - 30','witness@0 - 30');

        verifyNextConstraint('c1 - 27','witness@0 - 27');

        verifyNextConstraint('c1 - vec[5]','witness@0 - witness@6');
        verifyNextConstraint("c1 - 8'vec[5]","witness@0 - 8'witness@6");
        verifyNextConstraint("c1 - vec[5]'10","witness@0 - witness@6'10");

        verifyNextConstraint("c1 - 40320","witness@0 - 40320");
        verifyNextConstraint("c1 - vec[6]","witness@0 - witness@7");
        verifyNextConstraint("c1 - c1'120","witness@0 - witness@0'120");
        verifyNextConstraint("c1 - 24'c1","witness@0 - 24'witness@0");

        verifyNextConstraint("p1 - 100","witness@11 - 100");
        verifyNextConstraint("p1 - 314","witness@12 - 314");

        verifyNextConstraint("c1 - 24","witness@0 - 24");

        assert.strictEqual(constraints.it.next().done, true);
    });

});
