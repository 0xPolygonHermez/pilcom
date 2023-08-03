#!/usr/bin/env node

const protobuf = require('protobufjs');
const path = require("path");
const fs = require("fs");
const exp = require('constants');
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
    console.log("air",piloutDec.subproofs[0].airs[0].expressions[0])
    console.log(piloutDec.subproofs[0].airs[0].constraints)
    console.log(piloutDec.symbols)

    // Classify symbols
    // for (let i = 0; i < piloutDec.symbols.length; i++) {
    //     const symbol = piloutDec.symbols[i];
    //     console.log(`=== Symbol: ${symbol.name} ===`);
    //     console.log(symbol);
    // }

    for (let i = 0; i < piloutDec.subproofs.length; i++) {
        const subproof = piloutDec.subproofs[i];
        console.log(`=== SubProof: ${subproof.name} ===`);
        for (let j = 0; j < subproof.airs.length; j++) {
            const air = subproof.airs[j];
            console.log(`=== AIR: ${air.name} ===`);

            // Given a constraint, we use its expressionIdx to find the expression in a recursive way
            // TODO: Check if the following arrays is necessary
            let everyRow = [];
            let firstRow = [];
            let lastRow = [];
            let everyFrame = [];
            for (let k = 0; k < 1; k++) {
                let constraint = air.constraints[k];
                constraint = findConstraintByType(constraint);
                const expressionIdx = constraint.expressionIdx.idx;

                // For now, assume the ope is binary (lhs + rhs)
                let constt = [null, null, null];
                constraintConstruction(expressionIdx);

                function constraintConstruction(idx) {
                    let expression = air.expressions[idx];
                    let type;
                    [expression, type] = findExpressionByType(expression); // First step of constraint recursive construction
                    console.log("exp", expression, type)
                    const lhs = expression.lhs;
                    const rhs = expression.rhs;
                    constt[0] = lhs;
                    constt[1] = type;
                    constt[2] = rhs;
                    console.log("constt",constt)

                    if (lhs.expression !== undefined) {
                        const idx = lhs.expression.idx;
                        constraintConstruction(idx);
                    }
                    if (rhs.expression !== undefined) {
                        const idx = rhs.expression.idx;
                        constraintConstruction(idx);
                    }

                    let lhsElement = findExpElementByType(piloutDec.symbols, lhs);
                    let rhsElement = findExpElementByType(piloutDec.symbols, rhs);
                    console.log("hey3",lhsElement,rhsElement)

                    return [lhs, rhs]
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

function findConstraintByType(constraint) {
    if (constraint.everyRow !== undefined) {
        return constraint.everyRow;
    } else if (constraint.firstRow !== undefined) {
        return constraint.firstRow;
    } else if (constraint.lastRow !== undefined) {
        return constraint.lastRow;
    } else if (constraint.everyFrame !== undefined) {
        return constraint.everyFrame;
    } else {
        throw new Error(`Invalid constraint type ${constraint}`);
    }
}

// TODO: Complete
function findExpressionByType(expression) {
    if (expression.mul !== undefined) {
        return [expression.mul, '*'];
    } else if (expression.add !== undefined) {
        return [expression.add, '+'];
    } else if (expression.sub !== undefined) {
        return [expression.sub, '-'];
    } else {
        throw new Error(`Invalid expression type ${expression}`);
    }
}

// TODO: Complete
function findExpElementByType(symbols, expElement) {
    if (expElement.witnessCol !== undefined) {
        const witnessCol = expElement.witnessCol;
        const type = stringToSymbol("WITNESS_COL");
        return findSymbolByTypeAndId(symbols, type, witnessCol.colIdx);
        // return [witnessCol.stage, witnessCol.colIdx, witnessCol.rowOffset];

    } else if (expElement.fixedCol !== undefined) {
        const fixedCol = expElement.fixedCol;
        const type = stringToSymbol("FIXED_COL");
        return findSymbolByTypeAndId(symbols, type, fixedCol.idx);

    } else if (expElement.constant !== undefined) {
        return expElement.constant.value;

    } else {
        throw new Error(`Invalid expression element type ${expElement}`);
    }
}

function findSymbolByTypeAndId(symbols, type, id) {
    for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        if (symbol.type === type && symbol.id === id) {
            return symbol.name;
        }
    }
    throw new Error(`Invalid symbol type ${type} and id ${id}`);
}

function stringToSymbol(string) {
    switch (string) {
        case "IM_COL":
            return 0;
        case "FIXED_COL":
            return 1;
        case "PERIODIC_COL":
            return 2;
        case "WITNESS_COL":
            return 3;
        case "PROOF_VALUE":
            return 4;
        case "SUBPROOF_VALUE":
            return 5;
        case "PUBLIC_VALUE":
            return 6;
        case "PUBLIC_TABLE":
            return 7;
        case "CHALLENGE":
            return 8;
        default:
            throw new Error(`Invalid string ${string}`);
    }
}

function symbolToString(symbol) {
    switch (symbol) {
        case 0:
            return "IM_COL";
        case 1:
            return "FIXED_COL";
        case 2:
            return "PERIODIC_COL";
        case 3:
            return "WITNESS_COL";
        case 4:
            return "PROOF_VALUE";
        case 5:
            return "SUBPROOF_VALUE";
        case 6:
            return "PUBLIC_VALUE";
        case 7:
            return "PUBLIC_TABLE";
        case 8:
            return "CHALLENGE";
        default:
            throw new Error(`Invalid symbol ${symbol}`);
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