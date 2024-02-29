#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const tty = require('tty');
const assert = require('chai').assert;

const argv = require("yargs")
    .usage("table")
    .alias("v", "verbose")
    .alias("c", "clt")
    .alias("m", "mask")
    .argv;

function log2(value) {
    value = BigInt(value);
    let limit = 2n;
    let bits = 1;
    while (value >= limit) {
        limit = limit * 2n;
        ++bits;
    }
    return bits;
}

async function run() {

    const cins = [[0,1],[0,1,2,3],[0,1,2,3],[0,1,2,3]];
    const masks = [0x3FFFF, 0x1FFFF, 0x1FFFF, 0x00FFF];
    const gls = [0x00001, 0x1C000, 0x1FFFF, 0x00FFF];

    assert(64 === masks.reduce((t, x) => t+log2(x), 0));
    assert(0xFFFFFFFF00000001n === gls.reduce((t, x, i) => t + (BigInt(x) << BigInt(masks.slice(0, i).reduce((bits, mask) => bits += log2(mask), 0))), 0n));

    let ranges = [];
    let clt = false;
    let carry, lt;

    for (let index = 0; index < masks.length; ++index) {
        const _gl = gls[index];
        const _glhex = _gl.toString(16).toUpperCase().padStart(5, '0');
        const _mask = masks[index];
        for (const cin of cins[index]) {
            let tcount = 0;
            const _lt = cin >= 2 ? 1:0;
            const _carry = cin % 2 ? 1:0;
            for (let value = 0; value <= (_mask+1); ++value) {
                const value_ = value * 2 + _carry;
                const vmask_ = value_ & _mask;
                const carry_ = value_ > _mask ? 1:0;
                const lt_ = (vmask_ < _gl || (vmask_ == _gl && _lt)) ? 1:0;
                const clt_ = lt_ * 2 + carry_;

                if (clt === false) {
                    from = value;
                    clt = clt_;
                    carry = carry_;
                    lt = lt_;
                } else if (clt !== clt_ || value > _mask) {
                    const to = value - 1;
                    const fromUp = from * 2 + _carry;
                    const toUp = to * 2 + _carry;
                    const count = to - from + 1;
                    tcount += count;
                    const ranges = [[from, to],[fromUp, toUp],[fromUp & _mask, toUp & _mask]].map(
                                                    ft => (ft[0].toString(16).toUpperCase().padStart(5, '0') + 
                                                          (ft[0] == ft[1] ? '' : '..'+ft[1].toString(16).toUpperCase().padStart(5, '0'))).padEnd(12));
                    console.log(`//  ${index}  │ ${cin}  │ 0 │ ${ranges[0]} │ ${ranges[1]} │ ${carry} │ ${ranges[2]} │ ${lt}  │ ${_glhex} │ ${clt}  │ ${count.toString(10).padStart(6)} │ ${to == _mask ? tcount.toString(10).padStart(6):''}`);
                    from = value;
                    clt = (value > _mask) ? false : clt_;
                    carry = carry_;
                    lt = lt_;
                }                
            }
            clt = false;
            console.log('// ┄┄┄┄│┄┄┄┄│┄┄┄│┄┄┄┄┄┄┄┄┄┄┄┄┄┄│┄┄┄┄┄┄┄┄┄┄┄┄┄┄│┄┄┄│┄┄┄┄┄┄┄┄┄┄┄┄┄┄│┄┄┄┄│┄┄┄┄┄┄┄│┄┄┄┄│┄┄┄┄┄┄┄┄│┄┄┄┄┄┄┄┄');
        }
    }
/*
    console.log("Input Pol Commitmets: " + out.nCommitments);
    console.log("Q Pol Commitmets: " + out.nQ);
    console.log("Constant Pols: " + out.nConstants);
    console.log("Im Pols: " + out.nIm);
    console.log("plookupIdentities: " + out.plookupIdentities.length);
    console.log("permutationIdentities: " + out.permutationIdentities.length);
    console.log("connectionIdentities: " + out.connectionIdentities.length);
    console.log("polIdentities: " + out.polIdentities.length);
*/
    // await fs.promises.writeFile(outputFile.trim(), JSON.stringify(out, null, 1) + "\n", "utf8");
}


run().then(()=> {
    process.exitCode = 0;
}, (err) => {
    console.log(err.stack);
    console.log(err.message);
    process.exitCode = 1;
});
