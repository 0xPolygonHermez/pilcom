#!/usr/bin/env node

const protobuf = require('protobufjs');
const path = require("path");
const fs = require("fs");
const version = require("../package").version;

const argv = require("yargs")
    .version(version)
    .usage("$0 <source.ptb>")
    // .alias("o", "output")
    // .alias("P", "config")
    // .alias("v", "verbose")
    .argv;

async function run() {
    let inputFile;
    if (argv._.length == 0) {
        console.log("You need to specify a source file");
        process.exit(1);
    } else if (argv._.length == 1) {
        inputFile = argv._[0];
    } else {
        console.log("Only one pilout at a time is permited");
        process.exit(1);
    }

    const fullFileName = path.resolve(process.cwd(), inputFile);

    // TBD
    // const fileName = path.basename(fullFileName, ".pil");
    // const outputFile =
    //     typeof argv.output === "string" ? argv.output : fileName + ".json";
    // const config =
    //     typeof argv.config === "string"
    //         ? JSON.parse(fs.readFileSync(argv.config.trim()))
    //         : {};
    // if (argv.verbose) {
    //     config.verbose = true;
    //     if (typeof config.color === "undefined") {
    //         config.color = tty.isatty(process.stdout.fd);
    //     }
    // }

    // Decode the pilout from its root
    const piloutEnc = fs.readFileSync(fullFileName);
    const path2proto = path.join(__dirname, '..', 'src', '/pilout.proto');
    const root = protobuf.loadSync(path2proto);
    const PilOut = root.lookupType("PilOut");
    const piloutDec = PilOut.toObject(PilOut.decode(piloutEnc)); // pilout -> subproofs -> airs -> constraints
    console.log(piloutDec)
    // console.log(piloutDec.subproofs[0].airs[0].expressions)
    // console.log(piloutDec.subproofs[0].airs[0].constraints)


    for (let i = 0; i < piloutDec.subproofs.length; i++) {
        const subproof = piloutDec.subproofs[i];
        console.log(`=== SubProof: ${subproof.name} ===`);
        for (let j = 0; j < subproof.airs.length; j++) {
            const air = subproof.airs[j];
            console.log(`=== AIR: ${air.name} ===`);

            const everyRow = [];
            const firstRow = [];
            const lastRow = [];
            const everyFrame = [];
            for (let k = 0; k < air.constraints.length; k++) {
                const constraint = air.constraints[k];
                if (constraint.everyRow !== 'undefined') {
                    everyRow.push(constraint.everyRow);
                } else if (constraint.firstRow !== 'undefined') {
                    firstRow.push(constraint.firstRow);
                } else if (constraint.lastRow !== 'undefined') {
                    lastRow.push(constraint.lastRow);
                } else if (constraint.everyFrame !== 'undefined') {
                    everyFrame.push(constraint.everyFrame);
                }
            }

            console.log(`=== Constraints: EveryRow ===`);
            for (let k = 0; k < everyRow.length; k++) {
                const constraint = everyRow[k];
                console.log(`=== Constraint ${k} ===`);
                console.log(constraint.debugLine);
            }

            console.log(`=== Constraints: FirstRow ===`);
            for (let k = 0; k < firstRow.length; k++) {
                const constraint = firstRow[k];
                console.log(`=== Constraint ${k} ===`);
                console.log(constraint.debugLine);
            }

            console.log(`=== Constraints: LastRow ===`);
            for (let k = 0; k < lastRow.length; k++) {
                const constraint = lastRow[k];
                console.log(`=== Constraint ${k} ===`);
                console.log(constraint.debugLine);
            }

            console.log(`=== Constraints: EveryFrame ===`);
            for (let k = 0; k < everyFrame.length; k++) {
                const constraint = everyFrame[k];
                console.log(`=== Constraint ${k} ===`);
                console.log(constraint.debugLine);
            }
        }
    }
}

// const originalMethod = console.log;
// const maxSourceRefLen = 20;
// console.log = (...args) => {
//     let initiator = false;
//     try {
//         throw new Error();
//     } catch (e) {
//         if (typeof e.stack === "string") {
//             let isFirst = true;
//             for (const line of e.stack.split("\n")) {
//                 const matches = line.match(
//                     /^\s+at\s+.*\/([^\/:]*:[0-9]+:[0-9]+)\)/
//                 );
//                 if (matches) {
//                     if (!isFirst) {
//                         // first line - current function
//                         // second line - caller (what we are looking for)
//                         initiator = matches[1];
//                         break;
//                     }
//                     isFirst = false;
//                 }
//             }
//         }
//     }
//     if (initiator === false) {
//         originalMethod.apply(console, args);
//     } else {
//         initiator = initiator
//             .split(":")
//             .slice(0, 2)
//             .join(":")
//             .replace(".js", "");
//         initiator =
//             initiator.length > maxSourceRefLen
//                 ? "..." + initiator.substring(-maxSourceRefLen + 3)
//                 : initiator.padEnd(maxSourceRefLen);
//         originalMethod.apply(console, [
//             `\x1B[30;104m${initiator} \x1B[0m`,
//             ...args,
//         ]);
//     }
// };

run().then(
    () => {
        process.exit(0);
    },
    (err) => {
        console.log(err.stack);
        if (err.pos) {
            console.error(
                `ERROR at ${err.errFile}:${err.pos.first_line},${err.pos.first_column}-${err.pos.last_line},${err.pos.last_column}   ${err.errStr}`
            );
        } else {
            console.log(err.message);
        }
        process.exit(1);
    }
);