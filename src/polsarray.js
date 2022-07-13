const fs= require("fs");

function newConstantPolsArray(pil) {
    const pa = new PolsArray(pil, "constant");
    return pa;
}

function newCommitPolsArray(pil) {
    const pa = new PolsArray(pil, "commit");
    return pa;
}

module.exports.newConstantPolsArray = newConstantPolsArray;
module.exports.newCommitPolsArray = newCommitPolsArray;


class PolsArray {
    constructor(pil, type) {
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
        this.$$n = this.$$defArray[0].polDeg;
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
            const res = await fd.read(buff8, {offset: 0, position: p, length: n*8});
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

    writeToBuff(buff, pos) {
        if (typeof buff == "undefined") {
            const constBuffBuff = new SharedArrayBuffer(this.$$n*this.$$nPols*8);
            buff = new BigUint64Array(constBuffBuff);
        }
        const buff64 = new BigUint64Array(buff.buffer, buff.byteOffset + pos, this.$$n*this.$$nPols);
        let p=0;
        for (let i=0; i<this.$$n; i++) {
            for (let j=0; j<this.$$nPols; j++) {
                buff[p++] = (this.$$array[j][i] < 0n) ? (this.$$array[j][i] + 0xffffffff00000001n) : this.$$array[j][i];
            }
        }
        return buff;
    }
}