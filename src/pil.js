#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const version = require("../package").version;
const compile = require("./compiler.js");
const generate = require("./c_code_generator.js");
const ffjavascript = require("ffjavascript");

const argv = require("yargs")
    .version(version)
    .usage("pil <source.pil> -o <output.json>")
    .alias("o", "output")
    .alias("c", "ccodegeneration")
    .argv;

async function run() {
    let inputFile;
    if (argv._.length == 0) {
        console.log("Only one circuit at a time is permited");
        process.exit(1);
    } else if (argv._.length == 1) {
        inputFile = argv._[0];
    } else  {
        console.log("You need to specify a source file");
        process.exit(1);
    }

    const fullFileName = path.resolve(process.cwd(), inputFile);
    const fileName = path.basename(fullFileName, ".zkasm");

    const outputFile = typeof(argv.output) === "string" ?  argv.output : fileName + ".json";

    const cCodeGeneration = argv.ccodegeneration;
    const codeGenerationName = typeof(argv.ccodegeneration) === "string" ? argv.ccodegeneration : "pols_generated";

    /*
    const bn128 = await ffjavascript.getCurveFromName("bn128");
    const F = bn128.Fr;
    */

    const F = new ffjavascript.F1Field((1n<<64n)-(1n<<32n)+1n );

    const out = await compile(F, fullFileName);

    console.log(JSON.stringify(out, null, 1));
    
    console.log("Input Pol Commitmets: " + out.nCommitments);
    console.log("Q Pol Commitmets: " + out.nQ);
    console.log("Constant Pols: " + out.nConstants);
    console.log("Im Pols: " + out.nIm);
    console.log("plookupIdentities: " + out.plookupIdentities.length);
    console.log("permutationIdentities: " + out.permutationIdentities.length);
    console.log("connectionIdentities: " + out.connectionIdentities.length);
    console.log("polIdentities: " + out.polIdentities.length);

    await fs.promises.writeFile(outputFile.trim(), JSON.stringify(out, null, 1) + "\n", "utf8");
    
    if (cCodeGeneration)
    {
        let directoryName = codeGenerationName;

        // Create directory if it does not exist
        if (!fs.existsSync(directoryName)){
            fs.mkdirSync(directoryName);
        }

        const code = await generate.generateCCode(out, "cmP");
        await fs.promises.writeFile(directoryName + "/" + "commit_pols.hpp", code, "utf8");
        const code2 = await generate.generateCCode(out, "constP");
        await fs.promises.writeFile(directoryName + "/" + "constant_pols.hpp", code2, "utf8");
    }
}

run().then(()=> {
    process.exit(0);
}, (err) => {
//    console.log(err);
    console.log(err.stack);
    if (err.pos) {
        console.error(`ERROR at ${err.errFile}:${err.pos.first_line},${err.pos.first_column}-${err.pos.last_line},${err.pos.last_column}   ${err.errStr}`);
    } else {
        console.log(err.message);
    }
    process.exit(1);
});
