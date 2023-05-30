const protobuf = require('protobufjs');
const Long = require('long');

//
// Legacy Pil Stats
//
// 12213 expression "operations" in 2313 indexable expressions
// 631 constraints
// 393 imC
// 218 fixed
// 665 witness
// 317 nQ
// 44 publics

const MAX_CHALLENGE = 200;
const MAX_STAGE = 20;
const MAX_PROVER_VALUES = 200;
const MAX_PERIODIC_COLS = 60;
const MAX_PERIODIC_ROWS = 256;
const MAX_ROWS = 2 ** 28;
const MAX_FIXED_COLS = 150;
const MAX_PUBLICS = 50;

const GLOBAL_EXPRESSIONS = 1000;
const GLOBAL_CONSTRAINTS = 100;

module.exports = class ProtoOut {
    constructor (Fr) {
        this.root = protobuf.loadSync(__dirname + '/pilout.proto');
        this.constants = false;
        this.debug = false;
        this.references = true;
        this.varbytes = true;
        this.buildTypes();
        /* let data = this.generateBasicAir('myFirstAir', 2**10, MAX_STAGE, MAX_PERIODIC_COLS, MAX_FIXED_COLS, 670, 12000, 630);
        let len = data.length;
        data = this.generateBasicAir('myFirstAir', 2**10 * 4, MAX_STAGE, MAX_PERIODIC_COLS, MAX_FIXED_COLS, 670, 12000, 630);*/
        let data = this.generatePilOut('myFirstAir', 2**10, 8, MAX_PERIODIC_COLS, MAX_FIXED_COLS, 700, 12000, 700);
        let len = data.length;

        data = this.generatePilOut('myFirstAir', 2**10 * 4, 8, MAX_PERIODIC_COLS, MAX_FIXED_COLS, 700, 12000, 700);
        let len4 = data.length;

        console.log(Math.ceil((len4 - len)/3));
        let rowsSize = Math.ceil((len4 - len)/(3*2**10));
        let fixedSize = len - (rowsSize * 2**10);
        let fixedMB = Math.round(fixedSize / 2**20);
        console.log([rowsSize, fixedSize]);
        console.log(['2**23', Math.ceil(rowsSize * 8 + fixedMB),'MB', fixedSize]);
        console.log(['2**25', Math.ceil(rowsSize * 32 + fixedMB),'MB', fixedSize]);
        console.log(['2**27', Math.ceil(rowsSize * 128 + fixedMB),'MB', fixedSize]);

        data = this.generatePilOut('myFirstAir', [2**8, 2**10, 2**12], 8, MAX_PERIODIC_COLS, MAX_FIXED_COLS, 700, 12000, 700);
        len = data.length;

        data = this.generatePilOut('myFirstAir', [2**10, 2**12, 2**14], 8, MAX_PERIODIC_COLS, MAX_FIXED_COLS, 700, 12000, 700);
        len4 = data.length;

        console.log(Math.ceil((len4 - len)/3));
        rowsSize = Math.ceil((len4 - len)/(3*2**8));
        fixedSize = len - (rowsSize * 2**8);
        fixedMB = Math.round(fixedSize / 2**20);
        console.log([rowsSize, fixedSize]);
        console.log(['2**8,2**10,2**12', Math.ceil(rowsSize / 4 + fixedMB) ,'MB']);
        console.log(['2**23,2**25,2**27', Math.ceil(rowsSize * 8 + fixedMB) ,'MB']);

        //        this.testReflectionMode();
    }
    buildTypes() {
        this.PilOut = this.root.lookupType('PilOut');
        this.BaseFieldElement = this.root.lookupType('BaseFieldElement');
        this.BasicAir = this.root.lookupType('BasicAir');
        this.PublicTable = this.root.lookupType('PublicTable');
        this.GlobalExpression = this.root.lookupType('GlobalExpression');
        this.GlobalConstraint = this.root.lookupType('GlobalConstraint');
        this.Reference = this.root.lookupType('Reference');
        this.GlobalOperand = this.root.lookupType('GlobalOperand');
        this.GlobalExpression_Add = this.root.lookupType('GlobalExpression.Add');
        this.GlobalExpression_Sub = this.root.lookupType('GlobalExpression.Sub');
        this.GlobalExpression_Mul = this.root.lookupType('GlobalExpression.Mul');
        this.GlobalExpression_Neg = this.root.lookupType('GlobalExpression.Neg');
        this.GlobalOperand_Constant = this.root.lookupType('GlobalOperand.Constant');
        this.GlobalOperand_Challenge = this.root.lookupType('GlobalOperand.Challenge');
        this.GlobalOperand_ProverValue = this.root.lookupType('GlobalOperand.ProverValue');
        this.GlobalOperand_PublicValue = this.root.lookupType('GlobalOperand.PublicValue');
        this.GlobalOperand_PublicTableValue = this.root.lookupType('GlobalOperand.PublicTableValue');
        this.GlobalOperand_Expression = this.root.lookupType('GlobalOperand.Expression');
        this.PeriodicCol = this.root.lookupType('PeriodicCol');
        this.FixedCol = this.root.lookupType('FixedCol');
        this.Expression = this.root.lookupType('Expression');
        this.Constraint = this.root.lookupType('Constraint');
        this.Operand_Expression = this.root.lookupType('Operand.Expression');
        this.Constraint_FirstRow = this.root.lookupType('Constraint.FirstRow');
        this.Constraint_LastRow = this.root.lookupType('Constraint.LastRow');
        this.Constraint_EveryRow = this.root.lookupType('Constraint.EveryRow');
        this.Constraint_EveryFrame = this.root.lookupType('Constraint.EveryFrame');
        this.Operand_Constant = this.root.lookupType('Operand.Constant');
        this.Operand_Challenge = this.root.lookupType('Operand.Challenge');
        this.Operand_ProverValue = this.root.lookupType('Operand.ProverValue');
        this.Operand_PublicValue = this.root.lookupType('Operand.PublicValue');
        this.Operand_PeriodicCol = this.root.lookupType('Operand.PeriodicCol');
        this.Operand_FixedCol = this.root.lookupType('Operand.FixedCol');
        this.Operand_WitnessCol = this.root.lookupType('Operand.WitnessCol');
        this.Expression_Add = this.root.lookupType('Expression.Add');
        this.Expression_Sub = this.root.lookupType('Expression.Sub');
        this.Expression_Mul = this.root.lookupType('Expression.Mul');
        this.Expression_Neg = this.root.lookupType('Expression.Neg');

        // FrontEndField not used

        this.FrontEndField = this.root.lookupType('FrontEndField');
        this.FrontEndFieldArray = this.root.lookupType('FrontEndFieldArray');
        this.FronEndData = this.root.lookupType('FronEndData');
    }
    testReflectionMode() {
        let basicAir = new this.BasicAir.create();
        console.log(basicAir);
    }
    generatePilOut(name, rows, airs, periodicCols, fixedCols, witnessCols, expressions, constraints) {
        const references = periodicCols + fixedCols + witnessCols;
        let payload = {
            name,
            baseField: this.bint2buf(0xFFFFFFFF00000001n),
            airs: [],
            numChallenges: new Array(MAX_STAGE).fill(MAX_CHALLENGE),
            numProverValues: MAX_PROVER_VALUES,
            numPublicValues: MAX_PUBLICS,
            expressions: this.generateGlobalExpressions(GLOBAL_EXPRESSIONS, MAX_STAGE),
            constraints: this.generateGlobalConstraints(GLOBAL_CONSTRAINTS),
            references: this.generateReferences(references)
        };
        if (!Array.isArray(rows)) {
            rows = [rows];
        }
        const totalAirs = airs * rows.length;
        const airPeriodicCols = Math.floor(periodicCols / airs);
        const airFixedCols = Math.floor(fixedCols / airs);
        const airWitnessCols = Math.floor(witnessCols / airs);
        const airExpressions = Math.floor(expressions / airs);
        const airConstraints = Math.floor(constraints / airs);
        for (let index = 0; index < totalAirs; ++index) {
            console.log(`generating air ${index+1}/${totalAirs} .......`);
            payload.airs.push(this.generateBasicAir(name, rows[index % rows.length], MAX_STAGE, airPeriodicCols, airFixedCols, airWitnessCols, airExpressions, airConstraints));
        }
        for (let i = 0; i < totalAirs; ++i) {
            for (let j = 0; j < totalAirs; ++j) {
                if (i === j) continue;
                if (payload.airs[i] === payload.airs[j]) {
                    console.log(['EQUALS', i, j]);
                }
            }
        }

        let message = this.PilOut.fromObject(payload);
        let data = this.PilOut.encode(message).finish();
        return data;
    }
    generateBasicAir(name, rows, stages, periodicCols, fixedCols, witnessCols, expressions, constraints) {
        let payload = {
            name,
            numRows: rows,
            periodicCols: this.generatePeriodicCols(periodicCols),
            fixedCols: this.generateFixedCols(rows, fixedCols),
            stageWidths: this.generateStageWidths(stages, witnessCols),
            expressions: this.generateExpressions(expressions, rows, stages, periodicCols, fixedCols),
            constraints: this.generateConstraints(constraints)
        };
        /*
        console.log([payload.periodicCols.length,
                     payload.fixedCols.length,
                     payload.stageWidths.length,
                     payload.expressions.length,
                     payload.constraints.length]);
        let message = this.BasicAir.fromObject(payload);
        let data = this.BasicAir.encode(message).finish();
        console.log(data.length);
        */
        return payload;
    }
    generateReferences(references, totalAirs) {
        if (this.references === false) {
            return [];
        }
        let items = [];
        const fruits = ['Lemon', 'Orange', 'Grapefruit', 'Watermelon', 'Mango', 'Cherry', 'Banana', 'DragonFruit'];
        const desserts = ['Chocolate', 'Vanilla', 'Cake', 'Fruit', 'Tiramisu'];
        for (let air = 0; air < totalAirs; ++airs) {
            const airname = fruits[air % fruits.length]+(13*air);
            for (let index = 0; index < references; ++index) {
                const namespace = desserts[index % desserts.length]+(17*index);
                const dim = this.random(0, 5) % 4; // 0,4 => 0  1,5 => 1  2 => 2 3 => 3
                let lengths = Array(dim).map((x) => this.random(4, 32));
                let payload = { name: `${airname}::${namespace}.colname-${index}`, airId: air, type: index % 8, id: index, dim, lengths, debugLine: this.randomDebugLine()};
                items.push(payload);
            }
        }
        return items;
    }
    generateStageWidths(stages, witnessCols) {
        const size = witnessCols < stages ? stages : witnessCols;
        const witnessColSize = Math.floor(size / stages);
        let colSize = witnessCols - (witnessColSize * (stages - 1)); // first value
        let widths = [];
        for (let index = 0; index < stages; ++index) {
            widths.push(colSize);
            colSize = witnessColSize;
        }
        return widths;
    }
    generateCols(rows, periodicCols) {
        // let cols = [{values:[{value:}]}];
        let cols = [];
        for (let icol = 0; icol < periodicCols; ++icol) {
            let values = [];
            for (let irow = 0; irow < rows; ++irow) {
                values.push({value: this.randomConstant()});
            }
            cols.push({values});
        }
        return cols;
    }
    generatePeriodicCols(periodicCols) {
        return this.generateCols(MAX_PERIODIC_ROWS, periodicCols);
    }
    generateFixedCols(rows, fixedCols) {
        if (this.constants === false) {
            return [];
        }
        return this.generateCols(rows, fixedCols);
    }
    generateExpressions(expressions, rows, stages, periodicCols, fixedCols) {
        let exprs = [];
        let percent = Math.floor(expressions / 100);
        let constantOps = 5 * percent;
        let challengeOps = 5 * percent;
        let proverOps = 5 * percent;
        let publicOps = 5 * percent;
        let periodicColsOps = 5 * percent;
        let fixedColOps = 10 * percent;
        let witnessColOps = 15 * percent;
        // let expressionOps = totalOps - ....
        let addOps = 40 * percent;
        let subOps = 10 * percent;
        let mulOps = 45 * percent;
        // let negOps = totalOps - ....
        for (let index = 0; index < expressions; ++index) {
            let values;
            if (constantOps > 0) {
                values = {lhs: { constant: {value: this.randomFe()}},
                          rhs: { constant: {value: this.randomFe()}}};
                --constantOps;
            }
            else if (challengeOps > 0) {
                values = {lhs: { challenge: {stage: this.random(1, stages), idx: this.random(0, MAX_CHALLENGE)}},
                          rhs: { challenge: {stage: this.random(1, stages), idx: this.random(0, MAX_CHALLENGE)}}};
                --challengeOps;
            }
            else if (proverOps > 0) {
                values = {lhs: { proverValue: { idx: this.random(0, MAX_PROVER_VALUES)}},
                          rhs: { proverValue: { idx: this.random(0, MAX_PROVER_VALUES)}}};
                --proverOps;
            }
            else if (publicOps > 0) {
                values = {lhs: { publicValue: {idx: this.random(0, MAX_PUBLICS)}},
                          rhs: { publicValue: {idx: this.random(0, MAX_PUBLICS)}}};
                --publicOps;
            }
            else if (periodicColsOps > 0) {
                values = {lhs: { periodicCol: {idx: this.random(0, periodicCols), rowOffset: this.random(0, periodicCols)}},
                          rhs: { periodicCol: {idx: this.random(0, periodicCols), rowOffset: this.random(0, periodicCols)}}};
                --periodicColsOps;
            }
            else if (fixedColOps > 0) {
                values = {lhs: { fixedCol: {idx: this.random(0, fixedCols), rowOffset: this.random(0, rows)}},
                          rhs: { fixedCol: {idx: this.random(0, fixedCols), rowOffset: this.random(0, rows)}}};
                --fixedColOps;
            }
            else if (witnessColOps > 0) {
                values = {lhs: { witnessCol: { stage: this.random(1, stages), colIdx: this.random(0, fixedCols), rowOffset: this.random(0, rows)}},
                          rhs: { witnessCol: { stage: this.random(1, stages), colIdx: this.random(0, fixedCols), rowOffset: this.random(0, rows)}}};
                --witnessColOps;
            }
            else {
                values = {lhs: { expression: { value: this.random(0, expressions)}},
                          rhs: { expression: { value: this.random(0, expressions)}}};
            }
            if (addOps > 0) {
                exprs.push({ add: values });
                --addOps;
            }
            else if (subOps > 0) {
                exprs.push({ sub: values });
                --subOps;
            }
            else if (mulOps > 0) {
                exprs.push({ mul: values });
                --mulOps;
            }
            else {
                exprs.push({neg: {value: values.lhs}});
            }
        }
        return exprs;
    }
    generateGlobalExpressions(expressions, stages) {
        let exprs = [];
        let percent = Math.floor(expressions / 100);
        let constantOps = 5 * percent;
        let challengeOps = 10 * percent;
        let proverOps = 10 * percent;
        let publicOps = 10 * percent;
        // let expressionOps = totalOps - ....
        let addOps = 40 * percent;
        let subOps = 10 * percent;
        let mulOps = 45 * percent;
        // let negOps = totalOps - ....
        for (let index = 0; index < expressions; ++index) {
            let values;
            if (constantOps > 0) {
                values = {lhs: { constant: {value: this.randomFe()}},
                          rhs: { constant: {value: this.randomFe()}}};
                --constantOps;
            }
            else if (challengeOps > 0) {
                values = {lhs: { challenge: {stage: this.random(1, stages), idx: this.random(0, MAX_CHALLENGE)}},
                          rhs: { challenge: {stage: this.random(1, stages), idx: this.random(0, MAX_CHALLENGE)}}};
                --challengeOps;
            }
            else if (proverOps > 0) {
                values = {lhs: { proverValue: { idx: this.random(0, MAX_PROVER_VALUES)}},
                          rhs: { proverValue: { idx: this.random(0, MAX_PROVER_VALUES)}}};
                --proverOps;
            }
            else if (publicOps > 0) {
                values = {lhs: { publicValue: {idx: this.random(0, MAX_PUBLICS)}},
                          rhs: { publicValue: {idx: this.random(0, MAX_PUBLICS)}}};
                --publicOps;
            }
            else {
                values = {lhs: { expression: { value: this.random(0, expressions)}},
                          rhs: { expression: { value: this.random(0, expressions)}}};
            }

            if (addOps > 0) {
                exprs.push({ add: values });
                --addOps;
            }
            else if (subOps > 0) {
                exprs.push({ sub: values });
                --subOps;
            }
            else if (mulOps > 0) {
                exprs.push({ mul: values });
                --mulOps;
            }
            else {
                exprs.push({neg: {value: values.lhs}});
            }
        }
        return exprs;
    }
    generateConstraints(constraints) {
        const FirstRowConstraints = Number((constraints * 5) / 100);
        const LastRowConstraints = Number((constraints * 5) / 100);
        const EveryFrameConstraints = Number((constraints * 5) / 100);
        const EveryRowConstraints = constraints - FirstRowConstraints - LastRowConstraints - EveryFrameConstraints;

        let items = [];
        for (let index = 0; index < FirstRowConstraints; ++index) {
            let payload = { firstRow: { expressionIdx: { idx: this.random() }, debugLine: this.randomDebugLine()}};
            items.push(payload);
        }

        for (let index = 0; index < LastRowConstraints; ++index) {
            let payload = { lastRow: { expressionIdx: { idx: this.random() }, debugLine: this.randomDebugLine()}};
            items.push(payload);
        }
        for (let index = 0; index < EveryFrameConstraints; ++index) {
            let payload = { everyRow: { expressionIdx: { idx: this.random() }, debugLine: this.randomDebugLine()}};
            items.push(payload);
        }
        for (let index = 0; index < EveryRowConstraints; ++index) {
            let payload = { everyFrame: { expressionIdx: { idx: this.random() }, offsetMin: this.random(), offsetMax: this.random(),
                                          debugLine: this.randomDebugLine()}};
            items.push(payload);
        }
        return items;
    }
    generateGlobalConstraints(constraints) {
        let items = [];
        for (let index = 0; index < constraints; ++index) {
            let payload = { expressionIdx: { idx: this.random() }, debugLine: this.randomDebugLine()};
            items.push(payload);
        }
        return items;
    }
    randomDebugLine() {
        if (this.debug === false) {
            return null;
        }
        return 'example-of-debug-line:'+this.random()+' with-some-information:'+this.random()+' but-no-much';
    }
    bint2buf(value ,bytes = 0) {
        const buf = Buffer.alloc(32);
        buf.writeBigInt64BE(value >> 64n*3n, 0);
        buf.writeBigUInt64BE((value >> 64n*2n) & 0xFFFFFFFFFFFFFFFFn, 8);
        buf.writeBigUInt64BE((value >> 64n)  & 0xFFFFFFFFFFFFFFFFn, 16);
        buf.writeBigUInt64BE(value & 0xFFFFFFFFFFFFFFFFn, 24);
        if (bytes === 0 && this.varbytes) {
            const firstByte = buf[0];
            let index = 0;
            if (firstByte == 0x00 || firstByte == 0xFF) {
                while (buf[++index] === firstByte && index < 32);
            }
            if (firstByte == 0xFF && buf[index] & 0x80 == 0x00) {
                --index;
            }
            return buf.subarray(index);
        }
        if (bytes !== 0) {
            return buf.subarray(32-bytes);
        }
        return buf;
    }
    buf2bint(buf) {
        let value = 0n;
        let offset = 0;
        while ((buf.length - offset) >= 8) {
            value = (value << 64n) + (offset ? buf.readBigUInt64BE(offset):buf.readBigInt64BE(offset));
            offset += 8;
        }
        while ((buf.length - offset) >= 4) {
            value = (value << 32n) + (offset ? buf.readBigUInt32BE(offset):buf.readBigInt32BE(offset));
            offset += 4;
        }
        while ((buf.length - offset) >= 2) {
            value = (value << 16n) + (offset ? buf.readBigUInt16BE(offset):buf.readBigInt16BE(offset));
            offset += 2;
        }
        while ((buf.length - offset) >= 1) {
            value += (value << 8n) + (offset ? buf.readBigUInt8(offset):buf.readBigInt8(offset));
            offset += 1;
        }
        return value;
    }
    exportToFile() {
        /*
        let pilout = {
            name: 'myname',
            baseField:
        }
        const root = await protobuf.load(__dirname + '/pilout.proto');

        const PilOut = root.lookupType('pilout.PilOut');
        console.log(PilOut);
        */
    }
    random (min = 0, max = 0xFFFFFFFF) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    randomFe() {
        return this.randomBuf64Bits();
    }
    randomConstant() {
        // average bytes uses is 4. stats:
        //
        //   147180530 x 8 bytes
        //     1764327 x 7 bytes
        //     6087939 x 6 bytes
        //    19033903 x 5 bytes
        //     9025965 x 4 bytes
        //    26645051 x 3 bytes
        //    50516113 x 2 bytes
        //   161611025 x 1 bytes

        return this.bint2buf(BigInt(this.random(0, 0xFFFFFFFF)), 4);
    }
    randomBuf64Bits() {
        let value = (BigInt(this.random(0, 0xFFFFFFFF)) << 32n) + BigInt(this.random(0, 0xFFFFFFFF));
        return this.bint2buf(value, 4);
    }
    encodingExamples () {
        const buf = Buffer.alloc(100);

        // BaseFieldElement
        console.log("***** BaseField ******");
        let BaseFieldElement = this.root.lookupType('BaseFieldElement');
        let payload =
          { value: this.bint2buf(0x102030405060708090A0B0C0D0E0F0n) };
//          { value: this.bint2buf(-1n) };
        console.log(BaseFieldElement.verify(payload));
        let message = BaseFieldElement.fromObject(payload);
        console.log(message);

        console.log("==== ENCODE DELIMITED (BaseFieldElement) ====");
        let data = BaseFieldElement.encodeDelimited(message).finish();
        console.log(`---- data (${data.length}) ----`);
        console.log(data);
        console.log(BaseFieldElement.decodeDelimited(data));

        console.log("==== ENCODE (BaseFieldElement) ====");
        data = BaseFieldElement.encode(message).finish();
        console.log(`---- data (${data.length}) ----`);
        console.log(data);
        console.log(BaseFieldElement.decode(data));


        // BasicAir
        console.log("***** BaseAir ******");
        let BasicAir = this.root.lookupType('BasicAir');
        let numRows = (2n ** 32n)-1n;
        payload =
          { name: 'AAAAAAAAAA', numRows: numRows+'' };
//          { name: 'myFirstPilOut', numRows: Long.fromValue(2n**23n) };
//          { value: this.bint2buf(-1n) };
        console.log(BasicAir.verify(payload));
        message = BasicAir.fromObject(payload);
        console.log(message);
        // let payload = { name:'pepe', type: 1,  dim: 5, id: 4, awesomeField: "AwesomeString" };

        console.log("==== ENCODE DELIMITED (BasicAir) ====");
        data = BasicAir.encodeDelimited(message).finish();
        console.log(`---- data (${data.length}) ----`);
        console.log(data);
        console.log(BasicAir.decodeDelimited(data));

        console.log("==== ENCODE (BasicAir) ====");
        data = BasicAir.encode(message).finish();
        console.log(`---- data (${data.length}) ----`);
        console.log(data);
        console.log(BasicAir.decode(data));

        console.log("That's all !!");
    }
};

let pout = new module.exports();
