const assert = require("assert");
const fs = require("fs");
const Scalar = require("ffjavascript").Scalar;

module.exports.exportPolynomials = async function exportPolynomials(F, fileName, pols, polsDef) {

    // Check polynomials are ok
    assert(pols.length == polsDef.length);

    const fd =await fs.promises.open(fileName, "w+");

    for (let i=0; i<pols.length; i++) {
        console.log(`Writing pol ${i+1}/${pols.length}`);
        const N = polsDef[i].polDeg;
        if (pols[i].length!=N) {
            console.log(JSON.stringify(polsDef[i], null, 1));
            throw new Error(`Polynomial ${i} does not have the right length`);
        }
        let buff;
        if (polsDef[i].elementType == "bool") {
            buff = writeBool(pols[i]);
        } else if (polsDef[i].elementType == "s8") {
            buff = writeS8(pols[i]);
        } else if (polsDef[i].elementType == "u8") {
            buff = writeU8(pols[i]);
        } else if (polsDef[i].elementType == "s16") {
            buff = writeS16(pols[i]);
        } else if (polsDef[i].elementType == "u16") {
            buff = writeU16(pols[i]);
        } else if (polsDef[i].elementType == "s32") {
            buff = writeS32(pols[i]);
        } else if (polsDef[i].elementType == "u32") {
            buff = writeU32(pols[i]);
        } else if (polsDef[i].elementType == "s64") {
            buff = writeS64(F, pols[i]);
        } else if (polsDef[i].elementType == "u64") {
            buff = writeU64(F, pols[i]);
        } else if (polsDef[i].elementType == "field") {
            buff = writeField(F, pols[i]);
        } else {
            throw new Error(`Invalid Polynomial type: ${polsDef[i]}`);
        }

        await fd.write(buff);
    }

    await fd.close();

}

function writeBool(pol) {
    const buff = new Uint8Array(pol.length);
    for (let i=0; i<pol.length; i++) {
        if ((pol[i] === true)||(pol[i] === 1)||(pol[i]===1n)) {
            buff[i] = 1;
        } else if((pol[i] === false)||(pol[i] === 0)||(pol[i]===0n)) {
            buff[i] = 0;
        } else {
            throw new Error("Invalid boolean type: "+pols[i]);
        }
    }
    return buff;
}

function writeU8(pol) {
    const buff = new Uint8Array(pol.length);
    for (let i=0; i<pol.length; i++) {
        if (typeof pol[i] === "bigint") pol[i] = Number(pol[i])
        if ((typeof pol[i] !== "number") ||
           (pol[i]>255) ||
           (pol[i]<0))
        {
            throw new Error(`Invalid s8 pos :${i} val: ${pol[i]}`);
        }
        buff[i] = pol[i];
    }
    return buff;
}

function writeS8(pol) {
    const buff = new Int8Array(pol.length);
    for (let i=0; i<pol.length; i++) {
        if (typeof pol[i] === "bigint") pol[i] = Number(pol[i])
        if ((typeof pol[i] !== "number") ||
           (pol[i]>127) ||
           (pol[i]<-128))
        {
            throw new Error(`Invalid u8 pos :${i} val: ${pol[i]}`);
        }
        buff[i] = pol[i];
    }
    return buff;
}

function writeS16(pol) {
    const buff = new Uint8Array(pol.length*2);
    const buffV = new DataView(buff.buffer);
    for (let i=0; i<pol.length; i++) {
        if (typeof pol[i] === "bigint") pol[i] = Number(pol[i])
        if ((typeof pol[i] !== "number") ||
           (pol[i]>32767) ||
           (pol[i]<-32768))
        {
            throw new Error(`Invalid s16 pos :${i} val: ${pol[i]}`);
        }
        buffV.setInt16(i*2, pol[i], true);
    }
    return buff;
}

function writeU16(pol) {
    const buff = new Uint8Array(pol.length*2);
    const buffV = new DataView(buff.buffer);
    for (let i=0; i<pol.length; i++) {
        if (typeof pol[i] === "bigint") pol[i] = Number(pol[i])
        if ((typeof pol[i] !== "number") ||
           (pol[i]>65535) ||
           (pol[i]<0))
        {
            throw new Error(`Invalid u16 pos :${i} val: ${pol[i]}`);
        }
        buffV.setUint16(i*2, pol[i], true);
    }
    return buff;
}

function writeS32(pol) {
    const buff = new Uint8Array(pol.length*4);
    const buffV = new DataView(buff.buffer);
    for (let i=0; i<pol.length; i++) {
        if (typeof pol[i] === "BigInt") pol[i] = Number(pol[i])
        if ((typeof pol[i] !== "number") ||
           (pol[i]>2147483647) ||
           (pol[i]<-2147483648))
        {
            throw new Error(`Invalid s32 pos :${i} val: ${pol[i]}`);
        }
        buffV.setInt32(i*4, pol[i], true);
    }
    return buff;
}


function writeS32(pol) {
    const buff = new Uint8Array(pol.length*4);
    const buffV = new DataView(buff.buffer);
    for (let i=0; i<pol.length; i++) {
        if (typeof pol[i] === "bigint") {
            if  ((pol[i]>2147483647n) ||
                 (pol[i]<-2147483648n))
            {
                throw new Error(`Invalid u32 pos :${i} val: ${pol[i]}`);
            }
            v = Number(pol[i]);
        } else if (typeof pol[i] === "number") {
            if  ((pol[i]>2147483647) ||
                 (pol[i]<-2147483648))
            {
                throw new Error(`Invalid u32 pos :${i} val: ${pol[i]}`);
            }
            v = pol[i];
        }
        buffV.setInt32(i*4, v, true);
    }
    return buff;
}

function writeU32(pol) {
    const buff = new Uint8Array(pol.length*4);
    const buffV = new DataView(buff.buffer);
    for (let i=0; i<pol.length; i++) {
        if (typeof pol[i] === "bigint") {
            if  ((pol[i]>4294967295n) ||
                 (pol[i]<0n))
            {
                throw new Error(`Invalid u32 pos :${i} val: ${pol[i]}`);
            }
            v = Number(pol[i]);
        } else if (typeof pol[i] === "number") {
            if  ((pol[i]>4294967295) ||
                 (pol[i]<0))
            {
                throw new Error(`Invalid u32 pos :${i} val: ${pol[i]}`);
            }
            v = pol[i];
        }
        buffV.setUint32(i*4, v, true);
    }
    return buff;
}

function writeS64(F, pol) {
    const buff = new Uint8Array(pol.length*8);
    const buffV = new DataView(buff.buffer);
    const two63 = Scalar.shl(Scalar.e(1), 63);
    const two64 = Scalar.shl(Scalar.e(1), 64);
    const pmtwo63 = Scalar.sub(F.p, two63);
    for (let i=0; i<pol.length; i++) {
        let bn = F.toObject(F.e(pol[i]));
        if (Scalar.geq(bn, pmtwo63)) {
            bn = Scalar.sub(two64, Scalar.sub(F.p, bn))
        } else if (Scalar.geq(bn, two63)) {
            throw new Error(`Invalid s64 pos :${i} val: ${pol[i]}`);
        }

        const msb = Scalar.toNumber(Scalar.shr(bn, 32));
        const lsb = Scalar.toNumber(Scalar.band(bn, Scalar.e(0xFFFFFFFF)));
        buffV.setUint32(i*8, lsb, true);
        buffV.setUint32(i*8+4, lsb, true);
    }
    return buff;
}


function writeU64(F, pol) {
    const buff = new Uint8Array(pol.length*8);
    const buffV = new DataView(buff.buffer);
    const two64 = Scalar.shl(Scalar.e(1), 64);
    for (let i=0; i<pol.length; i++) {
        let bn = F.toObject(F.e(pol[i]));
        if (Scalar.geq(bn, two64)) {
            throw new Error(`Invalid u64 pos :${i} val: ${pol[i]}`);
        }

        const msb = Scalar.toNumber(Scalar.shr(bn, 32));
        const lsb = Scalar.toNumber(Scalar.band(bn, Scalar.e(0xFFFFFFFF)));
        buffV.setUint32(i*8, lsb, true);
        buffV.setUint32(i*8+4, msb, true);
    }
    return buff;
}


function writeField(F, pol) {
    const buff = new Uint8Array(pol.length*F.n8);
    const two64 = Scalar.shl(Scalar.e(1), 63);
    for (let i=0; i<pol.length; i++) {
        F.toRprLE(buff, i*F.n8, pol[i]);
    }
    return buff;
}


module.exports.importPolynomials = async function exportPolynomials(F, fileName, polsDef) {

    const pols = new Array(polsDef.length);

    const fd =await fs.promises.open(fileName, "r");

    for (let i=0; i<polsDef.length; i++) {
        console.log(`Reading pol ${i+1}/${polsDef.length}`);
        const N = polsDef[i].polDeg;
        if (polsDef[i].elementType == "bool") {
            pols[i] = await readBool(fd, N);
        } else if (polsDef[i].elementType == "s8") {
            pols[i] = await readS8(fd, N);
        } else if (polsDef[i].elementType == "u8") {
            pols[i] = await readU8(fd, N);
        } else if (polsDef[i].elementType == "s16") {
            pols[i] = await readS16(fd, N);
        } else if (polsDef[i].elementType == "u16") {
            pols[i] = await readU16(fd, N);
        } else if (polsDef[i].elementType == "s32") {
            pols[i] = await readS32(fd, N);
        } else if (polsDef[i].elementType == "u32") {
            pols[i] = await readU32(fd, N);
        } else if (polsDef[i].elementType == "s64") {
            pols[i] = await readS64(F, fd, N);
        } else if (polsDef[i].elementType == "u64") {
            pols[i] = await readU64(F, fd, N);
        } else if (polsDef[i].elementType == "field") {
            pols[i] = await readField(F, fd, N);
        } else {
            throw new Error(`Invalid Polynomial type: ${polsDef[i]}`);
        }
    }

    await fd.close();

    return pols;
}

async function readBool(fd, N) {
    const pol = new Array(N);
    const buff = new Uint8Array(N);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        pol[i] = buff[i] ? true : false;
    }
    return pol;
}

async function readS8(fd, N) {
    const pol = new Array(N);
    const buff = new Int8Array(N);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        pol[i] = buff[i];
    }
    return pol;
}

async function readU8(fd, N) {
    const pol = new Array(N);
    const buff = new Uint8Array(N);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        pol[i] = buff[i];
    }
    return pol;
}

async function readS16(fd, N) {
    const pol = new Array(N);
    const buff = new Uint8Array(N*2);
    const buffV = new DataView(buff.buffer);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        pol[i] = buffV.getInt16(i*2, true);
    }
    return pol;
}

async function readU16(fd, N) {
    const pol = new Array(N);
    const buff = new Uint8Array(N*2);
    const buffV = new DataView(buff.buffer);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        pol[i] = buffV.getUint16(i*2, true);
    }
    return pol;
}


async function readS32(fd, N) {
    const pol = new Array(N);
    const buff = new Uint8Array(N*4);
    const buffV = new DataView(buff.buffer);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        pol[i] = buffV.getInt32(i*4, true);
    }
    return pol;
}

async function readU32(fd, N) {
    const pol = new Array(N);
    const buff = new Uint8Array(N*4);
    const buffV = new DataView(buff.buffer);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        pol[i] = buffV.getUint32(i*4, true);
    }
    return pol;
}


async function readS64(F, fd, N) {
    const two63 = Scalar.shl(Scalar.e(1), 63);
    const two64 = Scalar.shl(Scalar.e(1), 64);
    const pol = new Array(N);
    const buff = new Uint8Array(N*8);
    const buffV = new DataView(buff.buffer);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        const LS = buffV.getUint32(i*8, true);
        const MS = buffV.getUnt32(i*8+4, true);
        const s = Scalar.add( Scalar.shl(Scalar.e(MS), 32), Scalar.e(LS));
        if (Scalar.geq(s, two63)) {
            pol[i] = F.e(Scalar.sub(Scalar.add(F.p, two64), s));
        } else {
            pol[i] = F.e(s);
        }
    }
    return pol;
}

async function readU64(F, fd, N) {
    const pol = new Array(N);
    const buff = new Uint8Array(N*8);
    const buffV = new DataView(buff.buffer);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        const LS = buffV.getUint32(i*8, true);
        const MS = buffV.getUint32(i*8+4, true);
        pol[i] = F.e(Scalar.add( Scalar.shl(Scalar.e(MS), 32), Scalar.e(LS)));
    }
    return pol;
}

async function readField(F, fd, N) {
    const pol = new Array(N);
    const buff = new Uint8Array(N*F.n8);
    const buffV = new DataView(buff.buffer);
    await fd.read(buff, 0, buff.length);
    for (let i=0; i<N; i++) {
        pol[i] = F.fromRprLE(buff, i*F.n8);
    }
    return pol;
}

