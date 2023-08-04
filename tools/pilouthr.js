#!/usr/bin/env node

const protobuf = require('protobufjs');
const path = require('path');
const fs = require('fs');
const exp = require('constants');
const version = require('../package').version;

const argv = require('yargs')
    .version(version)
    .usage('$0 <source.ptb>')
    // .alias('o', 'output')
    // .alias('P', 'config')
    // .alias('v', 'verbose')
    .argv;

async function run() {
    let inputFile;
    if (argv._.length == 0) {
        console.log('You need to specify a source file');
        process.exit(1);
    } else if (argv._.length == 1) {
        inputFile = argv._[0];
    } else {
        console.log('Only one pilout at a time is permited');
        process.exit(1);
    }

    const fullFileName = path.resolve(process.cwd(), inputFile);

    // TBD
    // const fileName = path.basename(fullFileName, '.pil');
    // const outputFile =
    //     typeof argv.output === 'string' ? argv.output : fileName + '.json';
    // const config =
    //     typeof argv.config === 'string'
    //         ? JSON.parse(fs.readFileSync(argv.config.trim()))
    //         : {};
    // if (argv.verbose) {
    //     config.verbose = true;
    //     if (typeof config.color === 'undefined') {
    //         config.color = tty.isatty(process.stdout.fd);
    //     }
    // }

    // Decode the pilout from its root
    const piloutEnc = fs.readFileSync(fullFileName);
    const path2proto = path.join(__dirname, '..', 'src', '/pilout.proto');
    const root = protobuf.loadSync(path2proto);
    const PilOut = root.lookupType('PilOut');
    const piloutDec = PilOut.toObject(PilOut.decode(piloutEnc)); // pilout -> subproofs -> airs -> constraints
    // console.log('air',piloutDec.subproofs[0].airs[0].expressions[0].sub)
    console.log(piloutDec.subproofs[1].airs[0].constraints)
    console.log(piloutDec.symbols)

    for (let i = 1; i < piloutDec.subproofs.length; i++) {
        const subproof = piloutDec.subproofs[i];
        console.log('■', `SubProof ${subproof.name}:`);
        for (let j = 0; j < subproof.airs.length; j++) {
            const air = subproof.airs[j];
            console.log(' '.repeat(2), '◆', `AIR ${air.name}:`);

            // Given a constraint, we use its expressionIdx to find the expression in a recursive way
            const types = ['everyRow', 'firstRow', 'lastRow', 'everyFrame'];
            let constraintOrg = {};
            for (let k = 0; k < types.length; k++) {
                constraintOrg[types[k]] = [];
            }
            for (let k = 0; k < air.constraints.length; k++) {
                let [constraint, type] = findConstraintByType(air.constraints[k], constraintOrg);
                const expressionIdx = constraint.expressionIdx.idx;

                // For now, assume the ope is binary (lhs + rhs)
                constraintOrg[type].push(constraintConstruction(expressionIdx) + ' === 0');

                function constraintConstruction(idx) {
                    let [expression, op] = findExpressionByType(air.expressions[idx]);
                    let lhs = expression.lhs;
                    let rhs = expression.rhs;
                    let lhsElement = findExpElementByType(piloutDec.symbols, lhs);
                    let rhsElement = findExpElementByType(piloutDec.symbols, rhs);

                    if (lhs.expression === undefined && rhs.expression === undefined) {
                        return '(' + lhsElement + ' ' + op + ' ' + rhsElement + ')';
                    } else if (lhs.expression === undefined && rhs.expression !== undefined) {
                        rhs = constraintConstruction(rhs.expression.idx);
                        return '(' + lhsElement + ' ' + op + ' ' + rhs + ')';
                    } else if (lhs.expression !== undefined && rhs.expression === undefined) {
                        lhs = constraintConstruction(lhs.expression.idx);
                        return '(' + lhs + ' ' + op + ' ' + rhsElement + ')';
                    }

                    lhs = constraintConstruction(lhs.expression.idx);
                    rhs = constraintConstruction(rhs.expression.idx);

                    return lhs + ' ' + op + ' ' + rhs;
                }
            }

            for (let k = 0; k < types.length; k++) {
                if (constraintOrg[types[k]].length > 0) {
                    console.log(' '.repeat(4), '▲', `Constraints ${types[k]}:`);
                    for (let l = 0; l < constraintOrg[types[k]].length; l++) {
                        console.log(' '.repeat(6), '•', constraintOrg[types[k]][l]);
                    }
                }
            }
        }
    }
}

function findConstraintByType(constraint, set) {
    if (constraint.everyRow !== undefined) {
        return [constraint.everyRow, 'everyRow'];

    } else if (constraint.firstRow !== undefined) {
        return [constraint.firstRow, 'firstRow'];

    } else if (constraint.lastRow !== undefined) {
        return [constraint.lastRow, 'lastRow'];

    } else if (constraint.everyFrame !== undefined) {
        return [constraint.everyFrame, 'everyFrame'];

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
    if (expElement.expression !== undefined) {
        return expElement.expression;

    } else if (expElement.challenge !== undefined) {
        const challenge = expElement.challenge;
        const type = stringToSymbol('CHALLENGE');
        return findSymbolByTypeAndId(symbols, type, challenge.idx);

    } else if (expElement.subproofValue !== undefined) {
        const subproofValue = expElement.subproofValue;
        const type = stringToSymbol('SUBPROOF_VALUE');
        return findSymbolByTypeAndId(symbols, type, subproofValue.idx);

    } else if (expElement.witnessCol !== undefined) {
        console.log(expElement)
        const witnessCol = expElement.witnessCol;
        const type = stringToSymbol('WITNESS_COL');

        const symbol = findSymbolByTypeAndId(symbols, type, witnessCol.colIdx);
        const rowOffset = witnessCol.rowOffset;
        if (rowOffset > 0) {
            return (rowOffset > 1 ? `${symbol}'${-rowOffset}` : `${symbol}'`);
        }
        if (rowOffset < 0) {
            return (rowOffset < -1 ? `${-rowOffset}'${symbol}` : `'${symbol}`);
        }
        return symbol;

    } else if (expElement.fixedCol !== undefined) {
        const fixedCol = expElement.fixedCol;
        const type = stringToSymbol('FIXED_COL');

        const symbol = findSymbolByTypeAndId(symbols, type, fixedCol.idx);
        const rowOffset = fixedCol.rowOffset;
        if (rowOffset > 0) {
            return (rowOffset > 1 ? `${symbol}'${-rowOffset}` : `${symbol}'`);
        }
        if (rowOffset < 0) {
            return (rowOffset < -1 ? `${-rowOffset}'${symbol}` : `'${symbol}`);
        }
        return symbol;

    } else if (expElement.constant !== undefined) {
        return buf2bint(expElement.constant.value);

    } else if (expElement.publicValue !== undefined) {
        const publicValue = expElement.publicValue;
        const type = stringToSymbol('PUBLIC_VALUE');
        return findSymbolByTypeAndId(symbols, type, publicValue.idx);
    } else {
        throw new Error(`Invalid expression element type ${expElement}`);
    }
}

// We should also look for subproofId
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
        case 'IM_COL':
            return 0;
        case 'FIXED_COL':
            return 1;
        case 'PERIODIC_COL':
            return 2;
        case 'WITNESS_COL':
            return 3;
        case 'PROOF_VALUE':
            return 4;
        case 'SUBPROOF_VALUE':
            return 5;
        case 'PUBLIC_VALUE':
            return 6;
        case 'PUBLIC_TABLE':
            return 7;
        case 'CHALLENGE':
            return 8;
        default:
            throw new Error(`Invalid string ${string}`);
    }
}

function buf2bint(buf) {
    let offset = 0;
    let value;
    if ((buf.length - offset) >= 8) {
        value = 0n;
    } else {
        value = 0;
    }
    while ((buf.length - offset) >= 8) {
        value = (value << 64n) + (offset ? buf.readBigUInt64BE(offset):buf.readBigInt64BE(offset));
        offset += 8;
    }
    while ((buf.length - offset) >= 4) {
        value = (value << 32) + (offset ? buf.readUInt32BE(offset):buf.readInt32BE(offset));
        offset += 4;
    }
    while ((buf.length - offset) >= 2) {
        value = (value << 16) + (offset ? buf.readUInt16BE(offset):buf.readInt16BE(offset));
        offset += 2;
    }
    while ((buf.length - offset) >= 1) {
        value += (value << 8) + (offset ? buf.readUInt8(offset):buf.readInt8(offset));
        offset += 1;
    }
    return value;
}

// const originalMethod = console.log;
// const maxSourceRefLen = 20;
// console.log = (...args) => {
//     let initiator = false;
//     try {
//         throw new Error();
//     } catch (e) {
//         if (typeof e.stack === 'string') {
//             let isFirst = true;
//             for (const line of e.stack.split('\n')) {
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
//             .split(':')
//             .slice(0, 2)
//             .join(':')
//             .replace('.js', '');
//         initiator =
//             initiator.length > maxSourceRefLen
//                 ? '...' + initiator.substring(-maxSourceRefLen + 3)
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