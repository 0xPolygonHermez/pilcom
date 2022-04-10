module.exports.createCommitedPols = function createCommitedPols(pil) {
    pols = {};
    polsArray = [];
    polsDef = {};
    polsArrayDef = [];
    for (let i=0; i<pil.nCommitments; i++) polsArray.push([]);
    for (refName in pil.references) {
        if (pil.references.hasOwnProperty(refName)) {
            ref = pil.references[refName];
            if (ref.type == "cmP") {
                [nameSpace, namePol] = refName.split(".");
                if (!pols[nameSpace]) pols[nameSpace] = {};
                if (!polsDef[nameSpace]) polsDef[nameSpace] = {};

                if (ref.isArray) {
                    pols[nameSpace][namePol] = [];
                    polsDef[nameSpace][namePol] = [];
                    for (let i=0; i<ref.len; i++) {
                        pols[nameSpace][namePol][i] = polsArray[ref.id + i];
                        polsArrayDef[ref.id + i] = {
                            name: refName,
                            id: ref.id + i,
                            idx: i,
                            elementType: ref.elementType,
                            polDeg: ref.polDeg
                        }        
                        polsDef[nameSpace][namePol][i] = polsArrayDef[ref.id + i];
                    }
                } else {
                    pols[nameSpace][namePol] = polsArray[ref.id];
                    polsArrayDef[ref.id] = {
                        name: refName,
                        id: ref.id,
                        elementType: ref.elementType,
                        polDeg: ref.polDeg
                    }
                    if (!polsDef[nameSpace]) polsDef[nameSpace] = {};
                    polsDef[nameSpace][namePol] = polsArrayDef[ref.id];
                }
            }
        }
    }
    for (let i=0; i<pil.nCommitments; i++) {
        if (!polsArrayDef[i]) {
            throw new Error("Invalid pils sequence");
        }
    }

    return [pols, polsArray, polsDef, polsArrayDef];
};


module.exports.createConstantPols = function createConstantPols(pil) {
    pols = {};
    polsArray = [];
    polsDef = {};
    polsArrayDef = [];
    for (let i=0; i<pil.nConstants; i++) polsArray.push([]);
    for (refName in pil.references) {
        if (pil.references.hasOwnProperty(refName)) {
            ref = pil.references[refName];
            if (ref.type == "constP") {
                [nameSpace, namePol] = refName.split(".");
                if (!pols[nameSpace]) pols[nameSpace] = {};
                if (!polsDef[nameSpace]) polsDef[nameSpace] = {};

                if (ref.isArray) {
                    pols[nameSpace][namePol] = [];
                    polsDef[nameSpace][namePol] = [];
                    for (let i=0; i<ref.len; i++) {
                        pols[nameSpace][namePol][i] = polsArray[ref.id + i];
                        polsArrayDef[ref.id + i] = {
                            name: refName,
                            id: ref.id + i,
                            idx: i,
                            elementType: ref.elementType,
                            polDeg: ref.polDeg
                        }        
                        polsDef[nameSpace][namePol][i] = polsArrayDef[ref.id + i];
                    }
                } else {
                    pols[nameSpace][namePol] = polsArray[ref.id];
                    polsArrayDef[ref.id] = {
                        name: refName,
                        id: ref.id,
                        elementType: ref.elementType,
                        polDeg: ref.polDeg
                    }
                    if (!polsDef[nameSpace]) polsDef[nameSpace] = {};
                    polsDef[nameSpace][namePol] = polsArrayDef[ref.id];
                }
            }
        }
    }
    for (let i=0; i<pil.nConstants; i++) {
        if (!polsArrayDef[i]) {
            throw new Error("Invalid pils sequence");
        }
    }

    return [pols, polsArray, polsDef, polsArrayDef];
};
