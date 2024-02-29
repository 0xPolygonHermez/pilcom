#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const tty = require('tty');

const argv = require("yargs")
    .usage("table")
    .alias("v", "verbose")
    .alias("c", "clt")
    .alias("m", "mask")
    .argv;
function log2(value) {
    let limit = 2n;
    let bits = 1;
    while (value >= limit) {
        limit = limit * 2n;
        ++bits;
    }
    return bits;
}

async function run() {
    let total = 0n;
    let tlevel = 0n;
    let loops = 0;
    let _level = 255;
    let level;
    let bits = 26;
    let mask = 2n ** BigInt(bits) - 1n;
    for (let lchunk = 0; lchunk < 16; ++lchunk) {
        ++loops;
        level = (lchunk << 4);
        let values = (2n**BigInt(255 - level) & mask)+1n;
        tlevel = tlevel + values;
        console.log(`${level} ${loops} ${tlevel.toString(16)} ${log2(tlevel)}`);
    }
    _level = level;
    console.log([tlevel, log2(tlevel), loops]);
    return;
    total += tlevel;
    loops = 0;
    tlevel = 0n;
    for (level = _level; level >= 207; --level) {
        ++loops;
        let values = 2n**BigInt((_level - level) >> 2);
        tlevel = tlevel + values;
        console.log(`${level} ${loops} ${tlevel.toString(16)} ${log2(tlevel)}`);
    }
    _level = level;
    console.log([tlevel, log2(tlevel), loops]);
    total += tlevel;
    loops = 0;
    tlevel = 0n;
    for (level = _level; level >= 0; --level) {
        ++loops;
        let values = 2n**BigInt((_level - level) >> 2);
        tlevel = tlevel + values;
        console.log(`${level} ${loops} ${tlevel.toString(16)} ${log2(tlevel)}`);
    }
}


run().then(()=> {
    process.exitCode = 0;
}, (err) => {
    console.log(err.stack);
    console.log(err.message);
    process.exitCode = 1;
});
