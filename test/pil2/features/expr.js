const chai = require("chai");
const { F1Field } = require("ffjavascript");
const assert = chai.assert;
const { compile, verifyPil, newConstantPolsArray, newCommitPolsArray } = require("../../..");

const testCycle = function (name, col, expected, times = 1, N = 2**7) {

    assert.equal(col.length, N, `${name} length`);
    for (let index = 0; index < N; ++index) {
        const eindex = Math.floor(index / times) % expected.length;
        assert.strictEqual(col[index], BigInt(expected[eindex]), `${name}[${index}]`);
    }
}

describe("Expressions Test", async function () {

    const F = new F1Field(0xffffffff00000001n);
    this.timeout(10000000);

    it("Test Expressions", async () => {
        const processor = await compile(F, __dirname + "/expr.pil", null, { processorTest: true });

        const N = 2 ** 7;
        const empty = new Array(N).fill(0);

        // col fixed BASIC = [1:1,2:2,3:3,4:4,5:5];
/*
        const BASIC = processor.fixeds.values[0].sequence.values;
        assert.equal(BASIC.length, 15);
        assert.equal(BASIC.toString(), "1,2,2,3,3,3,4,4,4,4,5,5,5,5,5");

        //  col fixed BASIC2 = [1:1,2:2,3:3,4:4,5:5]...;
        testCycle('BASIC2',
                   processor.fixeds.values[1].sequence.values,
                   [1,2,2,3,3,3,4,4,4,4,5,5,5,5,5]);

        // col fixed BYTE_C4096 = [0:3..13:3]...;
        testCycle('BYTE_C4096',
                   processor.fixeds.values[2].sequence.values,
                   [0,1,2,3,4,5,6,7,8,9,10,11,12,13], 3);

        // col fixed ODDS = [23,15,13..+..9]...;
        testCycle('ODDS',
                   processor.fixeds.values[3].sequence.values,
                   [23,15,13,11,9]);

        // col fixed X__ = [13,39..*..(13*3**31)]...;
        testCycle('X__',
                   processor.fixeds.values[4].sequence.values,
                   [13,39,13*(3**2),13*(3**3),13*(3**4),13*(3**5),13*(3**6),13*(3**7),13*(3**8),13*(3**9),
                    13*(3**10),13*(3**11),13*(3**12),13*(3**13),13*(3**14),13*(3**15),13*(3**16),13*(3**17),
                    13*(3**18),13*(3**19),13*(3**20),13*(3**21),13*(3**22),13*(3**23),13*(3**24),13*(3**25),
                    13*(3**26),13*(3**27),13*(3**28),13*(3**29),13*(3**30),13*(3**31)]);

        // col fixed FACTOR = [1,2..*..512]...;
        testCycle('FACTOR',
                   processor.fixeds.values[5].sequence.values,
                   [1,2,4,8,16,32,64,128,256,512]);

        // col fixed ODDS_F = [1,3..+..];
        testCycle('ODDS_F',
                   processor.fixeds.values[6].sequence.values,
                   empty.map((x, index) => 1n + 2n*BigInt(index)));

        // col fixed FACTOR_F = [1,2..*..];
        testCycle('FACTOR_F',
                   processor.fixeds.values[7].sequence.values,
                   empty.map((x, index) => 2n ** BigInt(index)));

        // col fixed ODDS_R = [1:10,3:10..+..13:10]...;
        testCycle('ODSS_R',
                   processor.fixeds.values[8].sequence.values,
                   [1,3,5,7,9,11,13],10);

        // col fixed FACTOR_R = [1:2,2:2..*..16:2]...;
        testCycle('FACTOR_R',
                   processor.fixeds.values[9].sequence.values,
                   [1,2,4,8,16],2);

        // col fixed FACTOR_R2 = [1:10,2:10..*..512:10]...;
        testCycle('FACTOR_R2',
                   processor.fixeds.values[10].sequence.values,
                   [1,2,4,8,16,32,64,128,256,512], 10);

        // col fixed ODDS_RF = [1:10,3:10..+..];
        testCycle('ODDS_RF',
                   processor.fixeds.values[11].sequence.values,
                   empty.map((x, index) => 1n + 2n * BigInt(index)), 10);

        // col fixed FACTOR_RF = [1:10,2:10..*..];
        testCycle('FACTOR_RF',
                   processor.fixeds.values[12].sequence.values,
                   empty.map((x, index) => 2n ** BigInt(index)), 10);

        // col fixed R_FACTOR_R = [16:2,8:2..*..1:2]...;
        testCycle('R_FACTOR_R',
                   processor.fixeds.values[13].sequence.values,
                   [16,8,4,2,1], 2);

        // col fixed R_FACTOR_R1 = [16,8..*..1]:16...;
        testCycle('R_FACTOR_R1',
                   processor.fixeds.values[14].sequence.values,
                   [16,8,4,2,1]);

        // col fixed R_FACTOR_R2 = [16:2,8:2..*..1:2]:10...;
        testCycle('R_FACTOR_R2',
                   processor.fixeds.values[15].sequence.values,
                   [16,8,4,2,1], 2);

        // col fixed R_FACTOR_RF = [8192:10,4096:10..*..];
        testCycle('R_FACTOR_RF',
                   processor.fixeds.values[16].sequence.values,
                   [8192,4096,2048,1024,512,256,128,64,32,16,8,4,2,1], 10);
*/
    });

});
