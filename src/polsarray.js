const fs= require("fs");

function newConstantPolsArray(pil) {
    const pa = new PolsArray(pil, "constant");
    const buff = new SharedArrayBuffer(pa.$$n*pa.$$nPols*8);
    pa.$$buffer = new BigUint64Array(buff);
    return pa;
}

function newCommitPolsArray(pil) {
    const pa = new PolsArray(pil, "commit");
    const buff = new SharedArrayBuffer(pa.$$n*pa.$$nPols*8);
    pa.$$buffer = new BigUint64Array(buff);
    return pa;
}

function useConstantPolsArray(pil, buff, pos) {
    const pa = new PolsArray(pil, "constant");
    pa.$$buffer = new BigUint64Array(buff.buffer, buff.byteOffset + pos, pa.$$n*pa.$$nPols);
    return pa;
}

function useCommitPolsArray(pil, buff, pos) {
    const pa = new PolsArray(pil, "commit");
    pa.$$buffer = new BigUint64Array(buff.buffer, buff.byteOffset + pos, pa.$$n*pa.$$nPols);
    return pa;
}

module.exports.newConstantPolsArray = newConstantPolsArray;
module.exports.newCommitPolsArray = newCommitPolsArray;
module.exports.useConstantPolsArray = useConstantPolsArray;
module.exports.useCommitPolsArray = useCommitPolsArray;


function createPolProxy(polArray, idPol, n) {
    const pol={
        polArray: polArray,
        deg: n,
        idPol: idPol
    };
    return new Proxy(pol, {
        get( obj, prop) {
            if (!isNaN(prop)) {
                return obj.polArray.$$buffer[obj.polArray.$$nPols * prop +  obj.idPol];
            } else if (prop == "length") {
                return obj.deg
            }
        },
        set( obj, prop, v) {
            obj.polArray.$$buffer[obj.polArray.$$nPols * prop +  obj.idPol] = v;
        },
    })
}

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
                            const polProxy = createPolProxy(this, ref.id + i, ref.polDeg);
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
                        const polProxy = createPolProxy(this, ref.id, ref.polDeg);
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
        const buff8 = new Uint8Array(this.$$buffer.buffer, this.$$buffer.byteOffset, this.$$n*this.$$nPols*8);

        const fd =await fs.promises.open(fileName, "r");
        await readBigBuffer(fd, buff8);
        await fd.close();

        async function  readBigBuffer(fd, buff8) {
            const MaxBuffSize = 1024*1024*32;  //  256Mb
            for (let i=0; i<buff8.byteLength; i+= MaxBuffSize) {
                const n = Math.min(buff8.byteLength -i, MaxBuffSize);
                await fd.read(buff8, {offset: i, position: i, length: n});
            }
        }
    }

    async saveToFile(fileName) {
        const buff8 = new Uint8Array(this.$$buffer.buffer, this.$$buffer.byteOffset, this.$$n*this.$$nPols*8);

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
}