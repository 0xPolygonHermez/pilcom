#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const version = require("../package").version;
const compile = require("./compiler.js");
const ffjavascript = require("ffjavascript");
const tty = require('tty');

const argv = require("yargs")
    .version(version)
    .usage("pil <source.pil> -o <output.json> [-P <pilconfig.json>]")
    .alias("o", "output")
    .alias("P", "config")
    .alias("v", "verbose")
    .alias("I", "include")
    .alias("f", "includePathFirst")
    .argv;

async function run() {
    let inputFile;
    if (argv._.length == 0) {
        console.log("You need to specify a source file");
        process.exit(1);
    } else if (argv._.length == 1) {
        inputFile = argv._[0];
    } else  {
        console.log("Only one circuit at a time is permited");
        process.exit(1);
    }

    const fullFileName = path.resolve(process.cwd(), inputFile);
    const fileName = path.basename(fullFileName, ".pil");

    const outputFile = typeof(argv.output) === "string" ?  argv.output : fileName + ".json";
    const config = typeof(argv.config) === "string" ? JSON.parse(fs.readFileSync(argv.config.trim())) : {};

    if (argv.verbose) {
        config.verbose = true;
        if (typeof config.color === 'undefined') {
            config.color = tty.isatty(process.stdout.fd);
        }
    }

    const F = new ffjavascript.F1Field((1n<<64n)-(1n<<32n)+1n );

    if (argv.include) {
        config.includePaths = argv.include.split(',');
    }

    if (argv.includePathFirst) {
        config.includePathFirst = true;
    }
    const out = await compile(F, fullFileName, null, config);
    console.log(out);
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

const originalMethod = console.log
const maxSourceRefLen = 20;
console.log = (...args) => {
    let initiator = false;
    try {
        throw new Error();
    } catch (e) {
    if (typeof e.stack === 'string') {
        let isFirst = true;
        for (const line of e.stack.split('\n')) {
        const matches = line.match(/^\s+at\s+.*\/([^\/:]*:[0-9]+:[0-9]+)\)/);
        if (matches) {
            if (!isFirst) { // first line - current function
                            // second line - caller (what we are looking for)
            initiator = matches[1];
            break;
            }
            isFirst = false;
        }
        }
    }
    }
    if (initiator === false) {
        originalMethod.apply(console, args);
    } else {
        initiator = initiator.split(':').slice(0,2).join(':').replace('.js','');
        initiator = initiator.length > maxSourceRefLen ? ('...' + initiator.substring(-maxSourceRefLen+3)) : initiator.padEnd(maxSourceRefLen);
        originalMethod.apply(console, [`\x1B[30;104m${initiator} \x1B[0m`, ...args]);
    }
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.stack);
    if (err.pos) {
        console.error(`ERROR at ${err.errFile}:${err.pos.first_line},${err.pos.first_column}-${err.pos.last_line},${err.pos.last_column}   ${err.errStr}`);
    } else {
        console.log(err.message);
    }
    process.exit(1);
});
