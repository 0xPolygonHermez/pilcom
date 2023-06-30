const { F1Field, BigBuffer: BigBufferFr } = require("ffjavascript");
const fs= require("fs");
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

    async saveToFile(fileName) {

        const fd =await fs.promises.open(fileName, "w+");

        const MaxBuffSize = 1024*1024*256;  //  256Mb
        const totalSize = this.$$nPols*this.$$n*this.F.n8;
        const buff = new Uint8Array(Math.min(totalSize, MaxBuffSize));
        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                const element = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
                this.F.toRprLE(buff, p, element);
                p += this.F.n8;

                if(p == buff.length) {
                    await fd.write(buff);
                    p=0;
                }
            }
        }

	    if (p) {
            const buff8 = new Uint8Array(buff.buffer, 0, p);
            await fd.write(buff8);
        }

        await fd.close();
    }

    writeToBuffGL(buff) {
        if (typeof buff == "undefined") {
            const constBuffBuff = new ArrayBuffer(this.$$n*this.$$nPols*8);
            buff = new BigUint64Array(constBuffBuff);
        }
        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                buff[p++] = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
            }
        }
        return buff;
    }

    writeToBigBufferGL(buff) {
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

    writeToBigBuffer(buff, Fr) {
        if (typeof buff == "undefined") {
            buff = new BigBufferFr(this.$$n*this.$$nPols*this.F.n8); 
        }
        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                const value = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + this.F.p) : this.$$array[j][i];
                buff.set(Fr.e(value), p);
                p += this.F.n8;
            }
        }
        return buff;
    }
}
