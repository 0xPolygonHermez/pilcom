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
    const fileName = path.basename(fullFileName, ".pil");

    // TBD
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

    const pilout = fs.readFileSync(fullFileName);

    const root = protobuf.loadSync(path.join(__dirname, '..', 'src') + '/pilout.proto');

    const types = lookupTypes(root);
    for (const type of types) {
        // console.log(type);
        try {
            console.log(type.decode(pilout));
        } catch (e) {
            // console.log(e);
        }
    }
}

function lookupTypes(root) {
    return [
        root.lookupType("PilOut"),
        root.lookupType("BaseFieldElement"),
        root.lookupType("Subproof"),
        root.lookupType("BasicAir"),
        root.lookupType('PublicTable'),
        root.lookupType('GlobalExpression'),
        root.lookupType('GlobalConstraint'),
        root.lookupType('Symbol'),
        root.lookupType('GlobalOperand'),
        root.lookupType('GlobalExpression.Add'),
        root.lookupType('GlobalExpression.Sub'),
        root.lookupType('GlobalExpression.Mul'),
        root.lookupType('GlobalExpression.Neg'),
        root.lookupType('GlobalOperand.Constant'),
        root.lookupType('GlobalOperand.Challenge'),
        root.lookupType('GlobalOperand.SubproofValue'),
        root.lookupType('GlobalOperand.ProofValue'),
        root.lookupType('GlobalOperand.PublicValue'),
        root.lookupType('GlobalOperand.PublicTableAggregatedValue'),
        root.lookupType('GlobalOperand.PublicTableColumn'),
        root.lookupType('GlobalOperand.Expression'),
        root.lookupType('PeriodicCol'),
        root.lookupType('FixedCol'),
        root.lookupType('Expression'),
        root.lookupType('Constraint'),
        root.lookupType('Operand.Expression'),
        root.lookupType('Constraint.FirstRow'),
        root.lookupType('Constraint.LastRow'),
        root.lookupType('Constraint.EveryRow'),
        root.lookupType('Constraint.EveryFrame'),
        root.lookupType('Operand.Constant'),
        root.lookupType('Operand.Challenge'),
        root.lookupType('Operand.SubproofValue'),
        root.lookupType('Operand.ProofValue'),
        root.lookupType('Operand.PublicValue'),
        root.lookupType('Operand.PeriodicCol'),
        root.lookupType('Operand.FixedCol'),
        root.lookupType('Operand.WitnessCol'),
        root.lookupType('Expression.Add'),
        root.lookupType('Expression.Sub'),
        root.lookupType('Expression.Mul'),
        root.lookupType('Expression.Neg'),
        root.lookupType('HintField'),
        root.lookupType('HintFieldArray'),
        root.lookupType('Hint'),
    ];
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