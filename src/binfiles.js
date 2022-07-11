const assert = require("assert");
const fs = require("fs");
const Scalar = require("ffjavascript").Scalar;

module.exports.exportPolynomials = async function exportPolynomials(F, fileName, pols, polsDef) {
    assert(pols.length == polsDef.length);
    assert(pols.length>0);
    const N = polsDef[0].polDeg;

    for (let i=0; i<pols.length; i++) {
        assert(polsDef[i].polDeg == N, "Multisize polynomials not supported");
        assert(pols[i].length == N, "Polynomial with invalid size")
        if (["s8", "s16", "s32", "s64"].indexOf(polsDef[i].elementType) >=0) {
            for (let k=0; k<N; k++) {
                pols[i][k] = F.e(pols[i][k]);
            }
        }
    }

    const fd =await fs.promises.open(fileName, "w+");

    const MaxBuffSize = 1024*1024*32;  //  256Mb
    let buffSize = pols.length*N;
    let nChunks = 1;
    let chunkSize = N;
    while (buffSize > MaxBuffSize) {
        buffSize = buffSize/2;
        nChunks = nChunks*2;
        chunkSize = chunkSize/2
    }

    const buff = new BigUint64Array(buffSize);
    const buff8 = new Uint8Array(buff.buffer);


    for (let i=0; i<nChunks; i++) {
        console.log(`Writing chunk ${i+1}/${nChunks}`);
        for (let j=0; j<chunkSize; j++) {
            for (let k=0; k<pols.length; k++) {
                buff[j*pols.length + k] = BigInt(pols[k][i*chunkSize + j]);
            }
        }
        await fd.write(buff8);
    }

    await fd.close();
}

module.exports.importPolynomials = async function importPolynomials(F, fileName, polsDef) {

    assert(polsDef.length>0);
    const N = polsDef[0].polDeg;

    const pols = new Array(polsDef.length);
    for (let i=0; i<pols.length; i++) pols[i] = new Array(N).fill(0n);

    const fd =await fs.promises.open(fileName, "r");

    const MaxBuffSize = 1024*1024*32;  //  256Mb
    let buffSize = pols.length*N;
    let nChunks = 1;
    let chunkSize = N;
    while (buffSize > MaxBuffSize) {
        buffSize = buffSize/2;
        nChunks = nChunks*2;
        chunkSize = chunkSize/2
    }

    const buff8 = new Uint8Array(buffSize*8);
    const buff = new BigUint64Array(buff8.buffer);

    for (let i=0; i<nChunks; i++) {
        console.log(`Reading chunk ${i+1}/${nChunks}`);
        await fd.read(buff8, 0, buff8.byteLength );
        for (let j=0; j<chunkSize; j++) {
            for (let k=0; k<pols.length; k++) {
                pols[k][i*chunkSize + j] = buff[j*pols.length + k];
            }
        }
    }

    await fd.close();

    return pols;
}


module.exports.importPolynomialsToBuffer = async function importPolynomialsToBuffer(buff, pos,  fileName, polsDef) {

    const nPols = polsDef.length;
    assert(nPols>0);
    const N = polsDef[0].polDeg;

    const fd =await fs.promises.open(fileName, "r");
    const buff8 = new Uint8Array(buff.buffer, buff.byteOffset + pos, N*nPols*8);

    await readBigBuffer(fd, buff8);
    await fd.close();

    async function  readBigBuffer(fd, buff8) {
        const MaxBuffSize = 1024*1024*32;  //  256Mb
        for (let i=0; i<buff8.byteLength; i+= MaxBuffSize) {
            const n = Math.min(buff8.byteLength -i, MaxBuffSize);
            await fd.read(buff8, {offset: i, position: 0, length: n});
        }
    }
}

module.exports.exportPolynomialsFromBuffer = async function importPolynomialsToBuffer(filename, buff, pos, polsDef) {
    const nPols = polsDef.length;
    const n = polsDef[0].polDeg;

    const buff8 = new Uint8Array(buff.buffer, buff.byteOffset + pos, nPols*n*8);

    const fd =await fs.promises.open(fileName, "w+");
    await writeBigBuffer(fd, buff8);
    await fd.close();

    async function writeBigBuffer(fd, buff8) {
        const MaxBuffSize = 1024*1024*32;  //  256Mb
        for (let i=0; i<buff8.byteLength; i+= MaxBuffSize) {
            const n = Math.min(buff8.byteLength -i, MaxBuffSize);
            const sb = new Uint8Array(buff8.buffer, buff8.byteOffset+i, n);
            await fd.write(sb);
        }
    }
}

