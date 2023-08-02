const protobuf = require('protobufjs');
const {cloneDeep} = require('lodash');
const Long = require('long');
const fs = require('fs');

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
const REF_TYPE_PROOF_VALUE = 4;
const REF_TYPE_SUBPROOF_VALUE = 5;
const REF_TYPE_PUBLIC_VALUE = 6;
const REF_TYPE_PUBLIC_TABLE = 7;
const REF_TYPE_CHALLENGE = 8;

module.exports = class ProtoOut {
    constructor (Fr, options = {}) {
        this.Fr = Fr;
        this.root = protobuf.loadSync(__dirname + '/pilout.proto');
        this.constants = false;
        this.debug = false;
        this.symbols = true;
        this.varbytes = true;
        this.airs = [];
        this.currentAir = null;
        this.witnessId2ProtoId = [];
        this.fixedId2ProtoId = [];
        this.options = options;
        this.bigIntType = options.bigIntType ?? 'Buffer';
        this.toBaseField = this.mapBigIntType();
        this.buildTypes();
    }
    mapBigIntType() {
        switch (this.bigIntType) {
            case 'Buffer': return this.bint2buf;
            case 'BigInt': return this.bint2bint;
            case 'uint8':
                this.uint8size = this.options.uint8size ?? 8;
                return this.bint2uint8;
        }
        throw new Error(`Invalid bigIntType ${this.bigIntType} on ProtoOut`);
    }
    buildTypes() {
        this.PilOut = this.root.lookupType('PilOut');
        this.BaseFieldElement = this.root.lookupType('BaseFieldElement');
        this.Subproof = this.root.lookupType('Subproof');
        this.BasicAir = this.root.lookupType('BasicAir');
        this.PublicTable = this.root.lookupType('PublicTable');
        this.GlobalExpression = this.root.lookupType('GlobalExpression');
        this.GlobalConstraint = this.root.lookupType('GlobalConstraint');
        this.Symbol = this.root.lookupType('Symbol');
        this.GlobalOperand = this.root.lookupType('GlobalOperand');
        this.GlobalExpression_Add = this.root.lookupType('GlobalExpression.Add');
        this.GlobalExpression_Sub = this.root.lookupType('GlobalExpression.Sub');
        this.GlobalExpression_Mul = this.root.lookupType('GlobalExpression.Mul');
        this.GlobalExpression_Neg = this.root.lookupType('GlobalExpression.Neg');
        this.GlobalOperand_Constant = this.root.lookupType('GlobalOperand.Constant');
        this.GlobalOperand_Challenge = this.root.lookupType('GlobalOperand.Challenge');
        this.GlobalOperand_SubproofValue = this.root.lookupType('GlobalOperand.SubproofValue');
        this.GlobalOperand_ProofValue = this.root.lookupType('GlobalOperand.ProofValue');
        this.GlobalOperand_PublicValue = this.root.lookupType('GlobalOperand.PublicValue');
        this.GlobalOperand_PublicTableAggregateValue = this.root.lookupType('GlobalOperand.PublicTableAggregatedValue');
        this.GlobalOperand_PublicTableColumn = this.root.lookupType('GlobalOperand.PublicTableColumn');
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
        this.Operand_SubproofValue = this.root.lookupType('Operand.SubproofValue');
        this.Operand_ProofValue = this.root.lookupType('Operand.ProofValue');
        this.Operand_PublicValue = this.root.lookupType('Operand.PublicValue');
        this.Operand_PeriodicCol = this.root.lookupType('Operand.PeriodicCol');
        this.Operand_FixedCol = this.root.lookupType('Operand.FixedCol');
        this.Operand_WitnessCol = this.root.lookupType('Operand.WitnessCol');
        this.Expression_Add = this.root.lookupType('Expression.Add');
        this.Expression_Sub = this.root.lookupType('Expression.Sub');
        this.Expression_Mul = this.root.lookupType('Expression.Mul');
        this.Expression_Neg = this.root.lookupType('Expression.Neg');

        // FrontEndField not used

        this.HintField = this.root.lookupType('HintField');
        this.HintFieldArray = this.root.lookupType('HintFieldArray');
        this.Hint = this.root.lookupType('Hint');
    }
    setupPilOut(name) {
        this.pilOut = {
            name,
            baseField: this.toBaseField(this.Fr.p),
            subproofs: [],
            numChallenges: [],
            numProofValues: 0,
            numPublicValues: 0,
            publicTables: [],
            expressions: [],
            constraints: [],
            hints: [],
            symbols: []
        }
    }
    encode() {
        console.log("hey",this.pilOut);
        let message = this.PilOut.fromObject(this.pilOut);
        console.log("hey",message);
        this.data = this.PilOut.encode(message).finish();
        // return this.data;
    }
    saveToFile(filename) {
        fs.writeFileSync(filename, this.data);
    }
    setAir(name, rows) {
        this.currentAir = {name, numRows: Number(rows)};
        this.currentSubproof.airs.push(this.currentAir);
    }
    setSubproof(name, aggregable = false) { // TODO: Add subproof value
        this.currentSubproof = {name, aggregable, airs: []};
        this.pilOut.subproofs.push(this.currentSubproof);
    }
    setGlobalSymbols(symbols) {
        this._setSymbols(symbols.keyValuesOfTypes(['public', 'subproofvalue', 'proofvalue']));
    }
    setSymbolsFromLabels(labels, type) {
        let symbols = [];
        for (const label of labels) {
            symbols.push([label.label, {type, locator: label.from, array: label.multiarray, data: {}}]);
        }
        this._setSymbols(symbols);
    }
    _setSymbols(symbols) {
        for(const [name, ref] of symbols) {
            console.log(ref);
            const arrayInfo = ref.array ? ref.array : {dim: 0, lengths: []};
            const [protoType, id, stage] = this.symbolType2Proto(ref.type, ref.locator);
            let payout = {
                name,
                airId: 0,
                type: protoType,
                id,
                stage,
                dim: arrayInfo.dim,
                lengths: arrayInfo.lengths,
                debugLine: (ref.data ?? {}).sourceRef ?? ''
            };
            this.pilOut.symbols.push(payout);
        }
    }

    symbolType2Proto(type, id) {
        switch(type) {
            case 'im':
                return [REF_TYPE_IM_COL, id, 0];

            case 'fixed': {
                const [ftype, protoId] = this.fixedId2ProtoId[id];
                if (ftype === 'P') return [REF_TYPE_PERIODIC_COL, protoId, 0];
                return [REF_TYPE_FIXED_COL, protoId, 0];
            }

            case 'witness': {
                const [stage, protoId] = this.witnessId2ProtoId[id];
                return [REF_TYPE_WITNESS_COL, protoId, stage];
            }
            case 'subproofvalue':
                return [REF_TYPE_SUBPROOF_VALUE, id, 0];

            case 'proofvalue':
                return [REF_TYPE_PROOF_VALUE, id, 0];

            case 'public':
                return [REF_TYPE_PUBLIC_VALUE, id, 0];

            case 'challenge':
                return [REF_TYPE_CHALLENGE, id, 0];

        }
        throw new Error(`Invalid symbol type ${type}`);
    }

    setPublics(publics) {
        this.pilOut.numPublicValues = publics.length;
    }
    setFixedCols(fixedCols) {
        this.setConstantCols(fixedCols, this.currentAir.numRows, false);
    }
    setPeriodicCols(periodicCols) {
        this.setConstantCols(periodicCols, this.currentAir.numRows, true);
    }
    setConstantCols(cols, rows, periodic) {
        const property = periodic ? 'periodicCols':'fixedCols';
        const airCols = this.setupAirProperty(property);

        const colType = periodic ? 'P':'F';
        for (const col of cols) {
            console.log([col, col.isPeriodic()]);
            const colIsPeriodic = col.isPeriodic() && col.rows < rows;
            if (colIsPeriodic !== periodic) continue;
            const _rows = periodic ? col.rows : rows;
            console.log(['rows', col.rows]);
            this.fixedId2ProtoId[col.id] = [colType, airCols.length];
            let values = [];
            for (let irow = 0; irow < _rows; ++irow) {
                values.push({value: this.toBaseField(col.getValue(irow))});
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
        console.log(cols);
        for (const col of cols) {
            console.log(['WITNESS', col]);
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
                console.log(['witnessId2ProtoId', witnessId, stageId]);
                this.witnessId2ProtoId[witnessId] = [stageId, index++];
            }
        }
    }
    setExpressions(packedExpressions) {
        const expressions = this.setupAirProperty('expressions');
        this._setExpressions(expressions, packedExpressions);
    }
    setGlobalExpressions(packedExpressions) {
        this._setExpressions(this.pilOut.expressions, packedExpressions);
    }
    _setExpressions(expressions, packedExpressions) {
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
                ope.constant.value.value = this.toBaseField(ope.constant.value.value);
                break;
        }
    }
    setupAirProperty(propname, init = []) {
        if (this.currentAir === null) {
            throw new Error('Current air not defined');
        }
        if (typeof this.currentAir[propname] !== 'undefined') {
            throw new Error(`Property ${propname} already defined on current air`);
        }
        this.currentAir[propname] = init;
        return this.currentAir[propname];
    }
    setGlobalConstraints(constraints, packed) {
        for (const [index, constraint] of constraints.keyValues()) {
            const packedExpressionId = constraints.getPackedExpressionId(constraint.exprId, packed);
            let payload = { expressionIdx: { idx: packedExpressionId },
                            debugLine: constraints.getDebugInfo(index, packed) };
            this.pilOut.constraints.push(payload);
        }
    }
    setConstraints(constraints, packed, options) {
        console.log(constraints.constraints);
        let airConstraints = this.setupAirProperty('constraints');
        for (const [index, constraint] of constraints.keyValues()) {
            let payload;
            const debugLine = constraints.getDebugInfo(index, packed, options);
            const packedExpressionId = constraints.getPackedExpressionId(constraint.exprId, packed, options);
            switch (constraint.boundery) {
                case false:
                case 'all':
                    payload = { everyRow: { expressionIdx: { idx: packedExpressionId }, debugLine}};
                    break;

                case 'first':
                    payload = { firstRow: { expressionIdx: { idx: packedExpressionId }, debugLine}};
                    break;

                case 'last':
                    payload = { lastRow: { expressionIdx: { idx: packedExpressionId }, debugLine}};
                    break;

                case 'frame':
                    payload = { everyFrame: { expressionIdx: { idx: packedExpressionId }, offsetMin: 0, offsetMax:0, debugLine}};
                    break;

                default:
                    throw new Error(`Invalid constraint boundery '${constraint.boundery}'`);

            }
            airConstraints.push(payload);
        }
        console.log(airConstraints[0]);
        console.log(airConstraints);
    }
    bint2uint8(value, bytes = 0) {
        let result = new Uint8Array(this.uint8size);
        for (let index = 0; index < this.uint8size; ++index) {
            result[this.uint8size - index - 1] = value & 0xFF;
            value = value >> 8;
        }
        assert(value === 0n);
        return result;
    }
    bint2bint(value, bytes = 0) {
        return BigInt(value);
    }
    bint2buf(value, bytes = 0) {
        if (this.bitIntType === 'bigint') {
            return BigInt(value);
        }
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
          { value: this.toBaseField(0x102030405060708090A0B0C0D0E0F0n) };
//          { value: this.toBaseField(-1n) };
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
//          { value: this.toBaseField(-1n) };
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
