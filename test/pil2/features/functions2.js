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
    const _rconstraint = expr.toString({hideClass: true, hideLabel: true});
    if (_sconstraint !== sconstraint || _rconstraint !== rconstraint) {
        expr.dump();
    }
    assert.equal(_sconstraint, sconstraint);
    assert.equal(_rconstraint, rconstraint);
}

describe("Functions", async function () {

    const F = new F1Field(0xffffffff00000001n);
    this.timeout(10000000);

    it("Functions Int Reference Test", async () => {
        constraints.processor = await compile(F, __dirname + "/functions2.pil", null, { processorTest: true });

        constraints.it = constraints.processor.constraints[Symbol.iterator]();

        verifyNextConstraint('c1 - 10','witness@0 - 10');

        verifyNextConstraint('c1 - 11','witness@0 - 11');

        verifyNextConstraint('c1 - 100','witness@0 - 100');
        verifyNextConstraint('c1 - 101','witness@0 - 101');
        verifyNextConstraint('c1 - 102','witness@0 - 102');
        verifyNextConstraint('c1 - 103','witness@0 - 103');
        verifyNextConstraint('c1 - 104','witness@0 - 104');

        verifyNextConstraint('c1 - 100','witness@0 - 100');
        verifyNextConstraint('c1 - 101','witness@0 - 101');
        verifyNextConstraint('c1 - 103','witness@0 - 103'); // <==== 102 + 1 = 103
        verifyNextConstraint('c1 - 103','witness@0 - 103');
        verifyNextConstraint('c1 - 104','witness@0 - 104');

        verifyNextConstraint('c1 - 22','witness@0 - 22');
        verifyNextConstraint('c1 - 16','witness@0 - 16');

        verifyNextConstraint('c1','witness@0');
        verifyNextConstraint('c1','witness@0');
        verifyNextConstraint('c1 - 2 * c2','witness@0 - 2 * witness@1');
        verifyNextConstraint('c1 - 2 * c2','witness@0 - 2 * witness@1');
        verifyNextConstraint('c1 - c2','witness@0 - witness@1');
        verifyNextConstraint('c1 - c2','witness@0 - witness@1');

        verifyNextConstraint('c1 - 200','witness@0 - 200');
        verifyNextConstraint('c1 - 202','witness@0 - 202');
        verifyNextConstraint('c1 - 206','witness@0 - 206');
        verifyNextConstraint('c1 - 206','witness@0 - 206');
        verifyNextConstraint('c1 - 208','witness@0 - 208');

        verifyNextConstraint('c2 - 1000','witness@1 - 1000');
        verifyNextConstraint('c2 - 1001','witness@1 - 1001');
        verifyNextConstraint('c2 - 1002','witness@1 - 1002');

        verifyNextConstraint('c2 - 1100','witness@1 - 1100');
        verifyNextConstraint('c2 - 1101','witness@1 - 1101');
        verifyNextConstraint('c2 - 1102','witness@1 - 1102');

        verifyNextConstraint('c2 - 1000','witness@1 - 1000');
        verifyNextConstraint('c2 - 1001','witness@1 - 1001');
        verifyNextConstraint('c2 - 1002','witness@1 - 1002');

        verifyNextConstraint('c2 - 2200','witness@1 - 2200');
        verifyNextConstraint('c2 - 2202','witness@1 - 2202');
        verifyNextConstraint('c2 - 2204','witness@1 - 2204');

        verifyNextConstraint('c2 - 2000','witness@1 - 2000');
        verifyNextConstraint('c2 - 2002','witness@1 - 2002');
        verifyNextConstraint('c2 - 2004','witness@1 - 2004');

        verifyNextConstraint('c2 - 4400','witness@1 - 4400');
        verifyNextConstraint('c2 - 4404','witness@1 - 4404');
        verifyNextConstraint('c2 - 4408','witness@1 - 4408');

        assert.strictEqual(constraints.it.next().done, true);
    });

});
