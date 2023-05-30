const protobuf = require('protobufjs');
const {cloneDeep} = require('lodash');
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

const REF_TYPE_IM_COL = 0;
const REF_TYPE_FIXED_COL = 1;
const REF_TYPE_PERIODIC_COL = 2;
const REF_TYPE_WITNESS_COL = 3;
const REF_TYPE_PROVER_VALUE = 4;
const REF_TYPE_PUBLIC_VALUE = 5;
const REF_TYPE_PUBLIC_TABLE = 6;
const REF_TYPE_CHALLENGE = 7;

module.exports = class ProtoOut {
    constructor (Fr) {
        this.Fr = Fr;
        this.root = protobuf.loadSync(__dirname + '/pilout.proto');
        this.constants = false;
        this.debug = false;
        this.references = true;
        this.varbytes = true;
        this.airs = [];
        this.currentAir = null;
        this.witnessId2ProtoId = [];
        this.fixedId2ProtoId = [];
        this.buildTypes();
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
    setupPilOut(name) {
        this.pilOut = {
            name,
            baseField: this.bint2buf(this.Fr.p),
            airs: [],
            numChallenges: [],
            numProverValues: 0,
            numPublicValues: 0,
            expressions: [],
            constraints: [],
            references: []
        }
    }
    encode() {
        let message = this.PilOut.fromObject(this.pilOut);
        let data = this.PilOut.encode(message).finish();
        console.log(data);
        return data;
    }
    setAir(name, rows) {
        this.currentAir = {name, numRows: rows};
        this.pilOut.airs.push(this.currentAir);
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
    setReferences(references) {
        for(const [name, ref] of references.keyValuesOfTypes(['witness', 'fixed', 'public'])) {
            console.log(ref);
            const arrayInfo = ref.array ? ref.array : {dim: 0, lengths: []};
            const [protoType, id, stage] = this.referenceType2Proto(ref.type, ref.locator);
            let payout = {
                name,
                airId: this.pilOut.airs.length - 1,
                type: 0,
                id,
                stage,
                dim: arrayInfo.dim,
                lengths: arrayInfo.lengths,
                debugLine: ''
            };
            this.pilOut.references.push(payout);
        }
    }

    referenceType2Proto(type, id) {
        switch(type) {
            case 'im':
                return [REF_TYPE_IM_COL, id, 0];

            case 'fixed': {
                console.log(id);
                const [ftype, protoId] = this.fixedId2ProtoId[id];
                if (ftype === 'P') return [REF_TYPE_PERIODIC_COL, protoId, 0];
                return [REF_TYPE_FIXED_COL, protoId, 0];
            }

            case 'witness': {
                const [stage, protoId] = this.witnessId2ProtoId[id];
                return [REF_TYPE_WITNESS_COL, protoId, stage];
            }
            case 'prover':
                return [REF_TYPE_PROVER_VALUE, id, 0];

            case 'public':
                return [REF_TYPE_PUBLIC_VALUE, id, 0];

            case 'challenge':
                return [REF_TYPE_CHALLENGE, id, 0];

        }
        throw new Error(`Invalid reference type ${type}`);
    }

    setPublics(publics) {
        this.pilOut.numPublicValues = publics.length;
    }
    setFixedCols(fixedCols) {
        this.setCols(fixedCols, this.currentAir.numRows, false);
    }
    setPeriodicCols(periodicCols) {
        this.setCols(periodicCols, this.currentAir.numRows, true);
    }
    setCols(cols, rows, periodic) {
        const property = periodic ? 'periodicCols':'fixedCols';
        const airCols = this.setupAirProperty(property);

        const colType = periodic ? 'P':'F';
        for (const col of cols) {
            if (col.isPeriodic() !== periodic) continue;
            this.fixedId2ProtoId[col.id] = [colType, airCols.length];
            let values = [];
            for (let irow = 0; irow < rows; ++irow) {
                values.push({value: this.bint2buf(col.getValue(irow))});
            }
            airCols.push({values});
        }
        console.log(airCols[0]);
    }
    setWitnessCols(cols) {
        const stageWidths = this.setupAirProperty('stageWidths');
        // sort by stage
        this.witnessId2ProtoId = [];
        let stages = [];
        for (const col of cols) {
            if (col.stage < 1) {
                throw new Error(`Invalid stage ${col.stage}`);
            }
            const stageIndex = col.stage - 1;
            if (typeof stages[stageIndex] === 'undefined') {
                stages[stageIndex] = [];
            }
            stages[stageIndex].push(col.id);
        }
        let stageId = 0;
        for (const stage of stages) {
            ++stageId;      // stageId starts by 1 (stage0 constant generation)

            stageWidths.push(stage.length);

            // colIdx must be relative stage
            let index = 0;
            for (const witnessId of stage) {
                this.witnessId2ProtoId[witnessId] = [stageId, index++];
            }
        }
        console.log(this.witnessId2ProtoId);
    }
    setExpressions(packedExpressions) {
        const expressions = this.setupAirProperty('expressions');
        for (const packedExpression of packedExpressions) {
            const e = cloneDeep(packedExpression);
            const [op] = Object.keys(e);
            switch (op) {
                case 'mul':
                case 'add':
                case 'sub':
                    this.translate(e[op].lhs);
                    this.translate(e[op].rhs);
                    break;
                case 'neg':
                    this.translate(e[op].value);
                    break;
                default:
                    throw new Error(`Invalid operation ${op} on packedExpression`);
            }
            expressions.push(e);
        }
    }
    translate(ope) {
        const [key] = Object.keys(ope);
        switch (key) {
            case 'fixedCol': {
                    // inside pil all fixed columns are equal, after that detect periodic cols
                    // and it implies change index number and type if finally is a periodic col.
                    const [type, protoId] = this.fixedId2ProtoId[ope.fixedCol.idx] ?? [false,false];
                    if (protoId === false) {
                        console.log(ope);
                        throw new Error(`Translate: Found invalid fixedColId ${ope.fixedCol.idx}`);
                    }
                    ope.fixedCol.colIdx = protoId;
                    if (type === 'P') {
                        ope.periodicCol = ope.fixedCol;
                        delete(ope.fixedCol);
                    }
                }
                break;

            case 'witnessCol': {
                    // translate index of witness because witness cols must be order by stage and
                    // it implies change index number.
                    const [stage, protoId] = this.witnessId2ProtoId[ope.witnessCol.colIdx] ?? [false, false];
                    if (protoId === false) {
                        throw new Error(`Translate: Found invalid witnessColId ${ope.witnessCol.colIdx}`);
                    }
                    ope.witnessCol.colIdx = protoId;
                }
                break;
            case 'constant':
                ope.constant.value = this.bint2buf(ope.constant.value);
                break;
        }
    }
    setupAirProperty(propname, init = []) {
        if (this.currentAir === null) {
            throw new Error('Not defined a current air');
        }
        if (typeof this.currentAir[propname] !== 'undefined') {
            throw new Error(`Property ${propname} already defined on current air`);
        }
        this.currentAir[propname] = init;
        return this.currentAir[propname];
    }
    setConstraints(constraints, packed) {
        let airConstraints = this.setupAirProperty('constraints');
        for (const [index, constraint] of constraints.keyValues()) {
            let payload;
            const debugLine = constraints.getDebugInfo(index, packed);
            switch (constraint.boundery) {
                case false:
                case 'all':
                    payload = { everyRow: { expressionIdx: { idx: constraint.exprId }, debugLine}};
                    break;

                case 'first':
                    payload = { firstRow: { expressionIdx: { idx: constraint.exprId }, debugLine}};
                    break;

                case 'last':
                    payload = { lastRow: { expressionIdx: { idx: constraint.exprId }, debugLine}};
                    break;

                case 'frame':
                    payload = { everyFrame: { expressionIdx: { idx: constraint.exprId }, offsetMin: 0, offsetMax:0, debugLine}};
                    break;

                default:
                    throw new Error(`Invalid contraint boundery '${constraint.boundery}'`);

            }
            airConstraints.push(payload);
        }
        console.log(airConstraints[0]);
        console.log(airConstraints);
    }
    bint2buf(value, bytes = 0) {
        if (value === 0n && bytes === 0) {
            return Buffer.alloc(0);
        }

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
