#!/usr/bin/env node

const fs = require("fs");
const version = require("../package").version;
const tty = require('tty');

const { F1Field } = require("ffjavascript");

const argv = require("yargs")
    .version(version)
    .usage("stats_legacy_pil.js <pil.json>")
    .argv;

class StatsLegacyPil {
    constructor(jsonFile) {
        this.Fr = new F1Field("0xFFFFFFFF00000001");

        console.log(`loading ${jsonFile} .....`);
        this.pil = JSON.parse(fs.readFileSync(jsonFile));
        console.log('');
    }
    run() {
        const expressionTerms = this.countExpressions();

        console.log(`${expressionTerms} expression "operations" in ${this.pil.expressions.length} indexable expressions`);
        console.log(`${this.pil.polIdentities.length} constraints`);
        console.log(`${this.pil.nIm} imC`);
        console.log(`${this.pil.nConstants} fixed`);
        console.log(`${this.pil.nCommitments} witness`);
        console.log(`${this.pil.nQ} nQ`);
        console.log(`${this.pil.publics.length} publics`);
    }
    countExpressions() {
        let count = 0;
        for (const expr of this.pil.expressions) {
            count = count + this.countExpression(expr);
        }
        return count;
    }
    countExpression(e)
    {
        switch (e.op) {
            case 'add':
            case 'sub':
            case 'mul':
                return 1 + this.countExpression(e.values[0]) + this.countExpression(e.values[1]);
            case 'neg':
                return 1 + this.countExpression(e.values[0]);
            case 'const':
            case 'cm':
            case 'exp':
            case 'public':
            case 'imP':
            case 'number':
                return 0;
        }
        throw new Error(`not found operation '${e.op}'`);
    }
}

async function run() {

    let jsonFile;
    if (argv._.length == 0) {
        jsonFile = __dirname + '/main.pil.json';
    } else if (argv._.length == 1) {
        jsonFile = argv._[0];
    } else {
        console.log("Only one json file at a time is permited");
        process.exit(1);
    }
    let stats = new StatsLegacyPil(jsonFile);
    stats.run();
    // const n = pil.references[Object.keys(pil.references)[0]].polDeg;
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});