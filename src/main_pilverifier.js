#!/usr/bin/env node

const fs = require("fs");
const version = require("../package").version;
const tty = require('tty');

const { importPolynomials } = require("./binfiles.js");

const { compile, verifyPil, newConstantPolsArray, newCommitPolsArray } = require("../index");

const { F1Field } = require("ffjavascript");

const argv = require("yargs")
    .version(version)
    .usage("main_pilverifier.js <commit.bin> -p <input.pil> [-j <input_pil.json>] -c <constant.bin> [-u <publics.json>]")
    .alias("p", "pil")
    .alias("j", "pil-json")
    .alias("c", "constant")
    .alias("P", "config")
    .alias("v", "verbose")
    .alias("u", "publics")
    .argv;

async function run() {

    const F = new F1Field("0xFFFFFFFF00000001");
    F.w[32] = F.e(7277203076849721926n);
    for (let i=31; i>=0; i--) F.w[i] = F.square(F.w[i+1]);

    let commitFile;
    if (argv._.length == 0) {
        console.log("You need to specify a commit file file file");
        process.exit(1);
    } else if (typeof(argv.pil) === "string" && typeof(argv.pilJson) === "string") {
        console.log("The options '-p' and '-j' exclude each other.");
        process.exit(1);
    } else if (argv._.length == 1) {
        commitFile = argv._[0];
    } else {
        console.log("Only one commit file at a time is permited");
        process.exit(1);
    }

    const publics = typeof(argv.publics) === "string" ?  JSON.parse(fs.readFileSync(argv.publics.trim())) : false;
    const constantFile = typeof(argv.constant) === "string" ?  argv.constant.trim() : "constant.bin";

    const config = typeof(argv.config) === "string" ? JSON.parse(fs.readFileSync(argv.config.trim())) : {};

    if (argv.verbose) {
        config.verbose = true;
        if (typeof config.color === 'undefined') {
            config.color = tty.isatty(process.stdout.fd);
        }
    }

    let pil;
    if (typeof(argv.pilJson) === "string") {
        pil = JSON.parse(fs.readFileSync(argv.pilJson.trim()));
    } else {
        const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "main.pil";
        pil = await compile(F, pilFile, null, config);
    }

    const n = pil.references[Object.keys(pil.references)[0]].polDeg;

    const constPols =  newConstantPolsArray(pil);
    const cmPols =  newCommitPolsArray(pil);

    await constPols.loadFromFile(constantFile);
    await cmPols.loadFromFile(commitFile);

    const res = await verifyPil(F, pil, cmPols, constPols, {publics});

    if (res.length != 0) {
        console.log("Pil does not pass");
        for (let i=0; i<res.length; i++) {
            console.log(res[i]);
        }
    } else {
        console.log("PIL OK!!")
    }
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

exports.log2 = function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}
