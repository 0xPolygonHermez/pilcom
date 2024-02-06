#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const version = require("../package").version;
const compile = require("./compiler.js");
const ffjavascript = require("ffjavascript");
const tty = require('tty');
const debugConsole = require('./debug_console.js').init();

const argv = require("yargs")
    .version(version)
    .usage("pil <source.pil> -o <output.json> [-P <pilconfig.json>]")
    .alias("e", "exec")
    .alias("o", "output")
    .alias("P", "config")
    .alias("v", "verbose")
    .alias("I", "include")
    .alias("f", "includePathFirst")
    .argv;

Error.stackTraceLimit = Infinity;

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
    let config = typeof(argv.config) === "string" ? JSON.parse(fs.readFileSync(argv.config.trim())) : {};

    if (argv.verbose) {
        config.verbose = true;
        if (typeof config.color === 'undefined') {
            config.color = tty.isatty(process.stdout.fd);
        }
    }

    // only execute
    if (argv.exec || argv.output === 'none') {
        config.protoOut = false;
    }
    const F = new ffjavascript.F1Field((1n<<64n)-(1n<<32n)+1n );

    if (argv.include) {
        config.includePaths = argv.include.split(',');
    }

    if (argv.includePathFirst) {
        config.includePathFirst = true;
    }
    console.log(config);
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


run().then(()=> {
    process.exitCode = 0;
}, (err) => {
    console.log(err.stack);
    if (err.pos) {
        console.error(`ERROR at ${err.errFile}:${err.pos.first_line},${err.pos.first_column}-${err.pos.last_line},${err.pos.last_column}   ${err.errStr}`);
    } else {
        console.log(err.message);
    }
    process.exitCode = 1;
});
