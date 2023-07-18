const { F1Field, BigBuffer: BigBufferFr } = require("ffjavascript");
const fs= require("fs");
const fastFile = require("fastfile");
const { BigBuffer } = require("./bigbuffer");
const { getRoots } = require("./utils");

function newConstantPolsArray(pil, F) {
    if(!F) F = new F1Field("0xFFFFFFFF00000001");

    if(F.p === 18446744069414584321n) F.w = getRoots(F);

    const pa = new PolsArray(pil, "constant", F);
    return pa;
}

function newCommitPolsArray(pil, F) {
    if(!F) F = new F1Field("0xFFFFFFFF00000001");

    if(F.p === 18446744069414584321n) F.w = getRoots(F);
    
    const pa = new PolsArray(pil, "commit", F);
    return pa;
}

module.exports.newConstantPolsArray = newConstantPolsArray;
module.exports.newCommitPolsArray = newCommitPolsArray;


class PolsArray {
    constructor(pil, type, F) {
        if (type == "commit") {
            this.$$nPols = pil.nCommitments;
        } else if (type == "constant") {
            this.$$nPols = pil.nConstants;
        } else {
            throw new Error("need to specify if you want commited or constant pols")
        }

        this.$$def = {};
        this.$$defArray = [];
        this.$$array = [];
        this.F = F;
        for (let refName in pil.references) {
            if (pil.references.hasOwnProperty(refName)) {
                const ref = pil.references[refName];
                if ((ref.type == "cmP" && type == "commit") ||
                    (ref.type == "constP" && type == "constant")) {
                    const [nameSpace, namePol] = refName.split(".");
                    if (!this[nameSpace]) this[nameSpace] = {};
                    if (!this.$$def[nameSpace]) this.$$def[nameSpace] = {};

                    if (ref.isArray) {
                        this[nameSpace][namePol] = [];
                        this.$$def[nameSpace][namePol] = [];
                        for (let i=0; i<ref.len; i++) {
                            const polProxy = new Array(ref.polDeg);
//                            const polProxy = createPolProxy(this, ref.id + i, ref.polDeg);
                            this[nameSpace][namePol][i] = polProxy;
                            this.$$defArray[ref.id + i] = {
                                name: refName,
                                id: ref.id + i,
                                idx: i,
                                elementType: ref.elementType,
                                polDeg: ref.polDeg
                            }
                            this.$$def[nameSpace][namePol][i] = this.$$defArray[ref.id + i];
                            this.$$array[ref.id+i] = polProxy;
                        }
                    } else {
                        const polProxy = new Array(ref.polDeg);
                        // const polProxy = createPolProxy(this, ref.id, ref.polDeg);
                        this[nameSpace][namePol] = polProxy;
                        this.$$defArray[ref.id] = {
                            name: refName,
                            id: ref.id,
                            elementType: ref.elementType,
                            polDeg: ref.polDeg
                        }
                        this.$$def[nameSpace][namePol] = this.$$defArray[ref.id];
                        this.$$array[ref.id] = polProxy;
                    }
                }
            }
        }
        for (let i=0; i<this.$$nPols; i++) {
            if (!this.$$defArray[i]) {
                throw new Error("Invalid pils sequence");
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

    writeToBigBuffer(buff) {
        if (typeof buff == "undefined") {
            buff = new BigBuffer(this.$$n*this.$$nPols);
        }
        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                const value = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
                buff.setElement(p++, value);
                
            }
        }
        return buff;
    }

    async loadFromFileFr(fileName, Fr) {

        if(Fr.p !== this.F.p) throw new Error("Curve Prime doesn't match");
        const fd = await fastFile.readExisting(fileName);

        const MaxBuffSize = 1024*1024; 
        const totalSize = this.$$nPols*this.$$n*this.F.n8;
        const buff = new Uint8Array((Math.min(totalSize, MaxBuffSize)));

	    const promises = [];
        
        let p=0;
        let n;
        for (let k=0; k<totalSize; k+= n) {
            console.log(`loading ${fileName}.. ${k/1024/1024} of ${totalSize/1024/1024}` );
            n = Math.min(buff.length, totalSize-k);
            promises.push(fd.read(n, p));
            p += n;
        }

        const res = await Promise.all(promises);

        let i=0;
        let j=0;
        for (let l=0; l<res.length; l+=1) {
            const buff = res[l];
            for(let k = 0; k < buff.length; k += this.F.n8) {
                this.$$array[i++][j] = BigInt(Fr.toString(buff.slice(k, k+this.F.n8)));
                if (i==this.$$nPols) {
                    i=0;
                    j++;
                }
            }    
        }

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
        
        const promises = [];
	    const MaxBuffSize = 1024*1024; 
        const totalSize = this.$$nPols*this.$$n*n8r;
        let values = [];
        const maxSize = Math.min(totalSize, MaxBuffSize);
        let n=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                if((values.length * n8r)%MaxBuffSize == 0) console.log(`saving ${fileName}.. ${n/1024/1024} of ${totalSize/1024/1024}`);
                const v = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
                values.push(v);

                if(values.length === (maxSize / n8r)) {
                    promises.push(this.writeBuffer(fd, values, n, Fr));
                    n += maxSize;
                    values = [];
                }
            }
        }

        if(values.length > 0) {
            promises.push(this.writeBuffer(fd, values, n, Fr));
        }

        await Promise.all(promises);

        await fd.close();
    }

    async writeToBigBufferFr(buff, Fr) {
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
        }

        return buff;
    }
}
