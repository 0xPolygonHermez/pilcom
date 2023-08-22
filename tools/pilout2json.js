#!/usr/bin/env node

const protobuf = require('protobufjs');
const path = require('path');
const fs = require('fs');
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

    // Decode the pilout from its root
    const piloutEnc = fs.readFileSync(fullFileName);
    const path2proto = path.join(__dirname, '..', 'src', '/pilout.proto');
    const root = protobuf.loadSync(path2proto);
    const PilOut = root.lookupType('PilOut');
    const piloutDec = PilOut.toObject(PilOut.decode(piloutEnc));
    
    fs.writeFileSync("pilout.json", JSON.stringify(piloutDec, null, 2));
}

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