const { F1Field, BigBuffer: BigBufferFr } = require("ffjavascript");
const fs= require("fs");
const fastFile = require("fastfile");
const { BigBuffer } = require("./bigbuffer");
const { getRoots } = require("./utils");

function newConstantPolsArray(pil, F) {
    if(!F) F = new F1Field("0xFFFFFFFF00000001");
    if(F.p === 18446744069414584321n) F.w = getRoots(F);
	
    const symbols = [];
    for (const polRef in pil.references) {
        const polInfo = pil.references[polRef];
        if(polInfo.type !== "constP") continue;
        symbols.push({name: polRef, idx: polInfo.id, length: polInfo.len});
    }

    const degree = pil.references[Object.keys(pil.references)[0]].polDeg;
    const pa = new PolsArray(symbols, degree, "constant", F);
    return pa;
}

function newCommitPolsArray(pil, F) {
    if(!F) F = new F1Field("0xFFFFFFFF00000001");
    if(F.p === 18446744069414584321n) F.w = getRoots(F);

    const symbols = [];
    for (const polRef in pil.references) {
        const polInfo = pil.references[polRef];
        if(polInfo.type !== "cmP") continue;
        symbols.push({name: polRef, idx: polInfo.id, length: polInfo.len});
    }

    const degree = pil.references[Object.keys(pil.references)[0]].polDeg;
    const pa = new PolsArray(symbols, degree, "commit", F);
    return pa;
}

function newConstantPolsArrayPil2(symbols, degree, F) {
    if(!F) F = new F1Field("0xFFFFFFFF00000001");
    if(F.p === 18446744069414584321n) F.w = getRoots(F);

    const fixedSymbols = [];
    for (let i = 0; i < symbols.length; ++i) {
        if(symbols[i].type !== 1) continue;
        fixedSymbols.push({name: symbols[i].name, idx: symbols[i].id, length: symbols[i].length});
    }

    const pa = new PolsArray(fixedSymbols, degree, "constant", F);
    return pa;
}

function newCommitPolsArrayPil2(symbols, degree, F) {
    if(!F) F = new F1Field("0xFFFFFFFF00000001");
    if(F.p === 18446744069414584321n) F.w = getRoots(F);

    const witnessSymbols = [];
    for (let i = 0; i < symbols.length; ++i) {
        if(symbols[i].type !== 3) continue;
        witnessSymbols.push({name: symbols[i].name, idx: symbols[i].id, length: symbols[i].length});
    }

    const pa = new PolsArray(witnessSymbols, degree, "commit", F);
    return pa;
}

module.exports.newConstantPolsArray = newConstantPolsArray;
module.exports.newCommitPolsArray = newCommitPolsArray;

module.exports.newConstantPolsArrayPil2 = newConstantPolsArrayPil2;
module.exports.newCommitPolsArrayPil2 = newCommitPolsArrayPil2;

class PolsArray {
    constructor(symbols, degree, type, F) {
        if (type != "commit" && type != "constant") throw new Error("need to specify if you want commited or constant pols");
        
        this.$$def = {};
        this.$$defArray = [];
        this.$$array = [];

        this.F = F;
        for(let i = 0; i < symbols.length; ++i) {
            const symbol = symbols[i];
            const name = symbol.name;
            const [nameSpace, namePol] = name.split(".");
            if (!this[nameSpace]) this[nameSpace] = {};
            if (!this.$$def[nameSpace]) this.$$def[nameSpace] = {};
            if (symbol.length > 0) {
                this[nameSpace][namePol] = [];
                this.$$def[nameSpace][namePol] = [];
                for(let j=0; j < symbol.length; ++j) {
                    const polProxy = new Array(degree);
                    const polId = symbol.idx + j;
                    this[nameSpace][namePol][j] = polProxy;
                    this.$$defArray[polId] = {
                        name: name,
                        id: polId,
                        idx: j,
                        polDeg: degree
                    }
                    this.$$def[nameSpace][namePol][j] = this.$$defArray[polId];
                    this.$$array[polId] = polProxy;
                }   
            } else {
                const polProxy = new Array(degree);
                this[nameSpace][namePol] = polProxy;
                this.$$defArray[symbol.idx] = {
                    name: name,
                    id: symbol.idx,
                    polDeg: degree
                }
                this.$$def[nameSpace][namePol] = this.$$defArray[symbol.idx];
                this.$$array[symbol.idx] = polProxy;
            }
        }

        this.$$nPols = this.$$defArray.length;
        if (this.$$defArray.length>0) {
            this.$$n = this.$$defArray[0].polDeg;
        } else {
            this.$$n = 0;
        }
    }

    async loadFromFile(fileName) {

        const fd =await fs.promises.open(fileName, "r");

        const MaxBuffSize = 1024*1024*32;  //  256Mb
        const totalSize = this.$$nPols*this.$$n;
        const buff = new BigUint64Array(Math.min(totalSize, MaxBuffSize));
        const buff8 = new Uint8Array(buff.buffer);

        let i=0;
        let j=0;
        let p=0;
        let n;
        for (let k=0; k<totalSize; k+= n) {
            console.log(`loading ${fileName}.. ${k/1024/1024} of ${totalSize/1024/1024}` );
            n= Math.min(buff.length, totalSize-k);
            const res = await fd.read({buffer: buff8, offset: 0, position: p, length: n*8});
            if (n*8 != res.bytesRead) console.log(`n: ${n*8} bytesRead: ${res.bytesRead} div: ${res.bytesRead/8}`);
            n = res.bytesRead/8;
            p += n*8;
            for (let l=0; l<n; l++) {
                this.$$array[i++][j] = buff[l];
                if (i==this.$$nPols) {
                    i=0;
                    j++;
                }
            }
        }

        await fd.close();

    }

    async saveToFile(fileName) {

        const fd =await fs.promises.open(fileName, "w+");

        const MaxBuffSize = 1024*1024*32;  //  256Mb
        const totalSize = this.$$nPols*this.$$n;
        const buff = new BigUint64Array(Math.min(totalSize, MaxBuffSize));

        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                buff[p++] = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + 0xffffffff00000001n) : this.$$array[j][i];
                if (p == buff.length) {
                    const buff8 = new Uint8Array(buff.buffer);
                    await fd.write(buff8);
                    p=0;
                }
            }
        }

        if (p) {
            const buff8 = new Uint8Array(buff.buffer, 0, p*8);
            await fd.write(buff8);
        }

        await fd.close();
    }

    writeToBuff(buff) {
        if (typeof buff == "undefined") {
            const constBuffBuff = new ArrayBuffer(this.$$n*this.$$nPols*8);
            buff = new BigUint64Array(constBuffBuff);
        }
        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                buff[p++] = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + 0xffffffff00000001n) : this.$$array[j][i];
            }
        }
        return buff;
    }

    writeToBigBuffer(buff, nPols) {
        if(!nPols) nPols = this.$$nPols;
        if (typeof buff == "undefined") {
            buff = new BigBuffer(this.$$n*this.$$nPols);
        }
        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                const value = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
                buff.setElement(p++, value);
                
            }
            for(let i = this.$$nPols; i < nPols; ++i) buff.setElement(p++, 0n);
        }
        return buff;
    }

    async loadFromFileFr(fileName, Fr) {

        if(Fr.p !== this.F.p) throw new Error("Curve Prime doesn't match");
        const fd = await fastFile.readExisting(fileName);

        const MaxBuffSize = 1024*1024*256; 
        const totalSize = this.$$nPols*this.$$n*this.F.n8;

        console.log(`Reading buffer with total size ${totalSize/1024/1024/8}...`);

        const buff = await fd.read(totalSize);

        console.log("Buffer read. Storing values...")

        let i=0;
        let j=0;
        for(let k = 0; k < totalSize; k += this.F.n8) {
            if(k%MaxBuffSize == 0) console.log(`Storing ${fileName}.. ${k/1024/1024/8} of ${totalSize/1024/1024/8}`);
            this.$$array[i++][j] = BigInt(Fr.toString(buff.slice(k, k+this.F.n8)));
            if (i==this.$$nPols) {
                i=0;
                j++;
            }
        }

        console.log("File loaded.")

        await fd.close();
    }

    async writeBuffer(fd, values, pos, Fr) {
        const n8r = this.F.n8;
        const buff = new Uint8Array(values.length*n8r);

        for(let k = 0; k < values.length; ++k) {
            buff.set(Fr.e(values[k]), k*n8r);
        }

        await fd.write(buff, pos);
    }

    async saveToFileFr(fileName, Fr) {
        if(Fr.p !== this.F.p) throw new Error("Curve Prime doesn't match");
        const fd =await fastFile.createOverride(fileName);

        const n8r = this.F.n8;

        const MaxBuffSize = 1024*1024*256; 
        const totalSize = this.$$nPols*this.$$n*n8r;

        const buff = new Uint8Array(totalSize);

        let p = 0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                if(p%MaxBuffSize == 0) console.log(`saving ${fileName}.. ${p/1024/1024/8} of ${totalSize/1024/1024/8}`);
                const v = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
                buff.set(Fr.e(v), p);
                p += n8r;            
            }
        }

        console.log("Writting buffer...")
        
        await fd.write(buff);

        console.log("File written.")

        await fd.close();
    }

    async loadFromFileFrLE(fileName) {

        const fd =await fs.promises.open(fileName, "r");

        const MaxBuffSize = 1024*1024*256;  //  256Mb
        const totalSize = this.$$nPols*this.$$n*this.F.n8;
        const buff = new Uint8Array((Math.min(totalSize, MaxBuffSize)));

        let i=0;
        let j=0;
        let p=0;
        let n;
        for (let k=0; k<totalSize; k+= n) {
            console.log(`loading ${fileName}.. ${k/1024/1024/8} of ${totalSize/1024/1024/8}` );
            n = Math.min(buff.length, totalSize-k);
            const res = await fd.read({buffer: buff, offset: 0, position: p, length: n});
            if (n != res.bytesRead) {
                console.log(`n: ${n} bytesRead: ${res.bytesRead} div: ${res.bytesRead}`);
                return;
            }
            n = res.bytesRead;
            p += n;
            for (let l=0; l<n; l+=this.F.n8) {
                this.$$array[i++][j] = this.F.fromRprLE(buff, l);
                if (i==this.$$nPols) {
                    i=0;
                    j++;
                }
            }
        }

        await fd.close();

    }

    async saveToFileFrLE(fileName) {

        const fd =await fs.promises.open(fileName, "w+");

        const MaxBuffSize = 1024*1024*256;  //  256Mb
        const totalSize = this.$$nPols*this.$$n*this.F.n8;
        const buff = new Uint8Array(Math.min(totalSize, MaxBuffSize));
        let p=0;
        let k=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                const element = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
                this.F.toRprLE(buff, p, element);
                p += this.F.n8;

                if(p == buff.length) {
                    console.log(`writting ${fileName}.. ${k/1024/1024/8} of ${totalSize/1024/1024/8}` );
                    await fd.write(buff);
                    p=0;
                    ++k;
                }
            }
        }

	    if (p) {
            const buff8 = new Uint8Array(buff.buffer, 0, p);
            await fd.write(buff8);
        }

        await fd.close();
    }

    async writeToBigBufferFr(buff, Fr, nPols) {
        if(!nPols) nPols = this.$$nPols;
        if(Fr.p !== this.F.p) throw new Error("Curve Prime doesn't match");

        const n8r = this.F.n8;

        if (typeof buff == "undefined") {
            buff = new BigBufferFr(this.$$n*this.$$nPols*n8r); 
        }
        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                const value = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
                buff.set(Fr.e(value), p);
                p += n8r;
            }
            for(let i = this.$$nPols; i < nPols; ++i) {
                buff.set(Fr.zero, p);
                p += n8r;
            }
        }

        return buff;
    }
}
