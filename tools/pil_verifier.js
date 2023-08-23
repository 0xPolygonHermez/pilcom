const { log2, getKs, getRoots } = require("./utils.js");

module.exports = async function verifyPil(F, pil, wtnsCols, fixCols, config = {}) {
    const res = [];

    const refWtns = {};
    const refFix = {};
    const refPer = {};
    const refIm = {};
    for (let symbol of pil.symbols) {
        const type = numberToString(symbol.type);
        if (type == "WITNESS_COL") {
            refWtns[symbol.id] = symbol;
        } else if (type == "FIXED_COL") {
            refFix[symbol.id] = symbol;
        } else if (type == "PERIODIC_COL") {
            refPer[symbol.id] = symbol;
        } else if (type == "IM_COL") {
            refIm[symbol.id] = symbol;
        } else {
            throw new Error("Reference type not handled: " + type);
        }
    }

    const cols = {
        wtns: [],
        exps: [],
        const: [],
        publics: [],
    };

    const N = wtnsCols.$$n;

    for (let i = 0; i < pil.nCommitments; i++) cols.wtns[i] = {};
    for (let i = 0; i < pil.expressions.length; i++) cols.exps[i] = {};
    for (let i = 0; i < pil.nConstants; i++) cols.const[i] = {};

    // 1.- Prepare commited polynomials.
    for (let i = 0; i < wtnsCols.$$nCols; i++) {
        cols.wtns[i].v_n = wtnsCols.$$array[i];
    }

    // 2.- Prepare fixed polynomials.
    for (let i = 0; i < fixCols.$$nCols; i++) {
        cols.const[i].v_n = fixCols.$$array[i];
    }

    // 3.- Prepare public inputs.
    for (let i = 0; i < pil.publics.length; i++) {
        if (config.publics) {
            cols.publics[i] = BigInt(config.publics[i]);
            console.log(
                `loading public[${i + 1}/${pil.publics.length}] = ${
                    cols.publics[i]
                }`
            );
        } else {
            console.log(`preparing public ${i + 1}/${pil.publics.length}`);
            if (pil.publics[i].polType == "WITNESS") {
                cols.publics[i] =
                    cols.wtns[pil.publics[i].polId].v_n[pil.publics[i].idx];
            } else if (pil.publics[i].polType == "imP") {
                await computeExpression(pil.publics[i].polId);
                cols.publics[i] =
                    cols.exps[pil.publics[i].polId].v_n[pil.publics[i].idx];
                delete cols.exps[pil.publics[i].polId].v_n;
            } else {
                throw new Error(`Invalid public type: ${polType.type}`);
            }
        }
    }

    // 4.- Check standard identities.
    for (let i = 0; i < pil.polIdentities.length; i++) {
        console.log(`Checking identity ${i + 1}/${pil.polIdentities.length}`);
        await computeExpression(pil.polIdentities[i].e);

        for (let j = 0; j < N; j++) {
            const v = cols.exps[pil.polIdentities[i].e].v_n[j];
            if (!F.isZero(v)) {
                res.push(
                    `${pil.polIdentities[i].fileName}:${
                        pil.polIdentities[i].line
                    }: identity does not match w=${j} val=${F.toString(v)} `
                );
                console.log(res[res.length - 1]);
                if (!config.continueOnError) j = N;
            }
        }

        delete cols.exps[pil.polIdentities[i].e].v_n;
    }

    // // 5.- Check connection identities.
    // for (let i = 0; i < pil.connectionIdentities.length; i++) {
    //     console.log(
    //         `Checking connectionIdentities ${i + 1}/${
    //             pil.connectionIdentities.length
    //         }`
    //     );
    //     ci = pil.connectionIdentities[i];
    //     for (let j = 0; j < ci.cols.length; j++) {
    //         await computeExpression(ci.cols[j]);
    //     }
    //     for (let j = 0; j < ci.connections.length; j++) {
    //         await computeExpression(ci.connections[j]);
    //     }

    //     console.log("start generating wtns");
    //     let wtns = getConnectionMap(F, N, ci.cols.length);

    //     for (let j = 0; j < ci.cols.length; j++) {
    //         for (let k = 0; k < N; k++) {
    //             if (k % 10000 == 0) console.log(`${k + 1}/${N}`);
    //             const v1 = cols.exps[ci.cols[j]].v_n[k];

    //             const a = cols.exps[ci.connections[j]].v_n[k];
    //             const a1 = Number(a >> 52n);
    //             const a2 = Number((a >> 40n) & 0xfffn);
    //             const a3 = Number(a & 0xffffffffffn);

    //             const [cp, cw] = wtns[a1][a2][a3];
    //             if (typeof cp == "undefined") {
    //                 res.push(
    //                     `${ci.fileName}:${
    //                         pil.connectionIdentities[i].line
    //                     }: invalid copy value w=${j},${k} val=${F.toString(
    //                         v1
    //                     )} `
    //                 );
    //                 console.log(res[res.length - 1]);
    //             }
    //             const v2 = cols.exps[ci.cols[cp]].v_n[cw];

    //             if (!F.eq(v1, v2)) {
    //                 res.push(
    //                     `${ci.fileName}:${
    //                         pil.connectionIdentities[i].line
    //                     }: connection does not match p1=${j} w1=${k} p2=${cp}, w2=${cw} val= ${F.toString(
    //                         v1
    //                     )} != ${F.toString(v2)}`
    //                 );
    //                 console.log(res[res.length - 1]);
    //                 k = N;
    //                 j = ci.cols.length;
    //             }
    //         }
    //     }

    //     for (let j = 0; j < ci.cols.length; j++) {
    //         delete cols.exps[ci.cols[j]].v_n;
    //     }
    //     for (let j = 0; j < ci.connections.length; j++) {
    //         delete cols.exps[ci.connections[j]].v_n;
    //     }
    // }

    // // 6.- Check lookup identities.
    // for (let i = 0; i < pil.plookupIdentities.length; i++) {
    //     console.log(
    //         `Checking plookupIdentities ${i + 1}/${
    //             pil.plookupIdentities.length
    //         }`
    //     );
    //     const pi = pil.plookupIdentities[i];

    //     for (let j = 0; j < pi.t.length; j++) {
    //         await computeExpression(pi.t[j]);
    //     }
    //     if (pi.selT !== null) {
    //         await computeExpression(pi.selT);
    //     }
    //     for (let j = 0; j < pi.f.length; j++) {
    //         await computeExpression(pi.f[j]);
    //     }
    //     if (pi.selF !== null) {
    //         await computeExpression(pi.selF);
    //     }

    //     let t = {};
    //     for (let j = 0; j < N; j++) {
    //         const selTValue =
    //             pi.selT == null ? F.one : cols.exps[pi.selT].v_n[j];
    //         if (!F.isZero(selTValue)) {
    //             const vals = [];
    //             for (let k = 0; k < pi.t.length; k++) {
    //                 vals.push(F.toString(cols.exps[pi.t[k]].v_n[j]));
    //             }
    //             const v = selTValue + ":" + vals.join(",");
    //             t[v] = true;
    //         }
    //     }

    //     for (let j = 0; j < N; j++) {
    //         const selFValue =
    //             pi.selF == null ? F.one : cols.exps[pi.selF].v_n[j];
    //         if (!F.isZero(selFValue)) {
    //             const vals = [];
    //             for (let k = 0; k < pi.f.length; k++) {
    //                 vals.push(F.toString(cols.exps[pi.f[k]].v_n[j]));
    //             }
    //             const v = selFValue + ":" + vals.join(",");
    //             if (!t[v]) {
    //                 res.push(
    //                     `${pil.plookupIdentities[i].fileName}:${pil.plookupIdentities[i].line}:  plookup not found w=${j} values: ${v}`
    //                 );
    //                 console.log(res[res.length - 1]);
    //                 if (!config.continueOnError) j = N; // Do not continue checking
    //             }
    //         }
    //     }

    //     for (let j = 0; j < pi.t.length; j++) {
    //         delete cols.exps[pi.t[j]].v_n;
    //     }
    //     if (pi.selT !== null) {
    //         delete cols.exps[pi.selT].v_n;
    //     }
    //     for (let j = 0; j < pi.f.length; j++) {
    //         delete cols.exps[pi.f[j]].v_n;
    //     }
    //     if (pi.selF !== null) {
    //         delete cols.exps[pi.selF].v_n;
    //     }
    // }

    // // 7.- Check permutation identities.
    // for (let i = 0; i < pil.permutationIdentities.length; i++) {
    //     console.log(
    //         `Checking permutationIdentities ${i + 1}/${
    //             pil.permutationIdentities.length
    //         }`
    //     );

    //     const pi = pil.permutationIdentities[i];

    //     for (let j = 0; j < pi.t.length; j++) {
    //         await computeExpression(pi.t[j]);
    //     }
    //     if (pi.selT !== null) {
    //         await computeExpression(pi.selT);
    //     }
    //     for (let j = 0; j < pi.f.length; j++) {
    //         await computeExpression(pi.f[j]);
    //     }
    //     if (pi.selF !== null) {
    //         await computeExpression(pi.selF);
    //     }

    //     let t = {};
    //     for (let j = 0; j < N; j++) {
    //         const selTValue =
    //             pi.selT == null ? F.one : cols.exps[pi.selT].v_n[j];
    //         if (!F.isZero(selTValue)) {
    //             const vals = [];
    //             for (let k = 0; k < pi.t.length; k++) {
    //                 vals.push(F.toString(cols.exps[pi.t[k]].v_n[j]));
    //             }
    //             const v = selTValue + ":" + vals.join(",");
    //             t[v] = (t[v] || 0) + 1;
    //         }
    //     }

    //     let showRemainingErrors = true;
    //     for (let j = 0; j < N; j++) {
    //         const selFValue =
    //             pi.selF == null ? F.one : cols.exps[pi.selF].v_n[j];
    //         if (!F.isZero(selFValue)) {
    //             const vals = [];
    //             for (let k = 0; k < pi.f.length; k++) {
    //                 vals.push(F.toString(cols.exps[pi.f[k]].v_n[j]));
    //             }
    //             const v = selFValue + ":" + vals.join(",");
    //             const found = t[v] ?? false;
    //             if (!t[v]) {
    //                 res.push(
    //                     `${pi.fileName}:${pi.line}:  permutation not ` +
    //                         (found === 0 ? "enought " : "") +
    //                         `found w=${j} values: ${v}`
    //                 );
    //                 console.log(res[res.length - 1]);
    //                 if (!config.continueOnError) {
    //                     j = N; // Do not continue checking
    //                     showRemainingErrors = false;
    //                 }
    //             } else {
    //                 t[v] -= 1;
    //             }
    //         }
    //     }
    //     if (showRemainingErrors) {
    //         for (const v in t) {
    //             if (t[v] === 0) continue;
    //             res.push(
    //                 `${pi.fileName}:${pi.line}:  permutation failed. Remaining ${t[v]} values: ${v}`
    //             );
    //             console.log(res[res.length - 1]);
    //         }
    //     }

    //     for (let j = 0; j < pi.t.length; j++) {
    //         delete cols.exps[pi.t[j]].v_n;
    //     }
    //     if (pi.selT !== null) {
    //         delete cols.exps[pi.selT].v_n;
    //     }
    //     for (let j = 0; j < pi.f.length; j++) {
    //         delete cols.exps[pi.f[j]].v_n;
    //     }
    //     if (pi.selF !== null) {
    //         delete cols.exps[pi.selF].v_n;
    //     }
    // }

    return res;

    function eval(exp) {
        let a = [];
        let b = [];
        let c;
        let r = [];
        if (exp.op == "add") {
            a = eval(exp.values[0]);
            b = eval(exp.values[1]);
            r = new Array(a.length);
            for (let i = 0; i < a.length; i++) r[i] = F.add(a[i], b[i]);
        } else if (exp.op == "sub") {
            a = eval(exp.values[0]);
            b = eval(exp.values[1]);
            r = new Array(a.length);
            for (let i = 0; i < a.length; i++) r[i] = F.sub(a[i], b[i]);
        } else if (exp.op == "mul") {
            a = eval(exp.values[0]);
            b = eval(exp.values[1]);
            r = new Array(a.length);
            for (let i = 0; i < a.length; i++) r[i] = F.mul(a[i], b[i]);
        } else if (exp.op == "addc") {
            a = eval(exp.values[0]);
            c = F.e(exp.const);
            r = new Array(a.length);
            for (let i = 0; i < a.length; i++) r[i] = F.add(a[i], c);
        } else if (exp.op == "mulc") {
            a = eval(exp.values[0]);
            c = F.e(exp.const);
            r = new Array(a.length);
            for (let i = 0; i < a.length; i++) r[i] = F.mul(a[i], c);
        } else if (exp.op == "neg") {
            a = eval(exp.values[0]);
            r = new Array(a.length);
            for (let i = 0; i < a.length; i++) r[i] = F.neg(a[i]);
        } else if (exp.op == "wtns") {
            r = cols.wtns[exp.id].v_n;
            if (exp.next) r = getPrime(r);
        } else if (exp.op == "const") {
            r = cols.const[exp.id].v_n;
            if (exp.next) r = getPrime(r);
        } else if (exp.op == "exp") {
            r = cols.exps[exp.id].v_n;
            if (exp.next) r = getPrime(r);
        } else if (exp.op == "number") {
            v = F.e(exp.value);
            r = new Array(N);
            for (let i = 0; i < N; i++) r[i] = v;
        } else if (exp.op == "public") {
            r = new Array(N);
            for (let i = 0; i < N; i++) r[i] = cols.publics[exp.id];
        } else {
            throw new Error(`Invalid op: ${exp.op}`);
        }

        return r;
    }

    function getPrime(p) {
        const r = p.slice(1);
        r[p.length - 1] = p[0];
        return r;
    }

    async function computeExpression(expId) {
        console.log("Computing expression: " + expId);

        if (cols.exps[expId] && cols.exps[expId].v_n)
            return cols.exps[expId].v_n;

        await calculateDependencies(pil.expressions[expId]);

        const p = eval(pil.expressions[expId]);

        cols.exps[expId].v_n = p;
        return cols.exps[expId].v_n;
    }

    async function calculateDependencies(exp) {
        if (exp.op == "exp") {
            await computeExpression(exp.id);
        }
        if (exp.values) {
            for (let i = 0; i < exp.values.length; i++) {
                await calculateDependencies(exp.values[i]);
            }
        }
    }
};

const cacheConnectionMaps = {};

function getConnectionMap(F, N, nk) {
    const kc = F.p.toString() + "_" + N.toString() + "_" + nk.toString();
    if (cacheConnectionMaps[kc]) return cacheConnectionMaps[kc];

    const pow = log2(N);

    const m = new Array(1 << 16);
    const ks = [1n, ...getKs(F, nk - 1)];
    let w = F.one;
    const roots = getRoots(F);
    const wi = roots[pow];
    for (let i = 0; i < N; i++) {
        if (i % 10000 == 0) console.log(`Building wtns.. ${i}/${N}`);
        for (j = 0; j < ks.length; j++) {
            const a = F.mul(ks[j], w);
            const a1 = Number(a >> 52n);
            const a2 = Number((a >> 40n) & 0xfffn);
            const a3 = Number(a & 0xffffffffffn);
            if (!m[a1]) m[a1] = new Array(1 << 16);
            if (!m[a1][a2]) m[a1][a2] = {};
            m[a1][a2][a3] = [j, i];
        }
        w = F.mul(w, wi);
    }

    cacheConnectionMaps[kc] = m;
    return m;
}

function numberToString(number) {
    switch (number) {
        case 0:
            return "IM_COL";
        case 1:
            return "FIXED_COL";
        case 2:
            return "PERIODIC_COL";
        case 3:
            return "WITNESS_COL";
        case 4:
            return "PROOF_VALUE";
        case 5:
            return "SUBPROOF_VALUE";
        case 6:
            return "PUBLIC_VALUE";
        case 7:
            return "PUBLIC_TABLE";
        case 8:
            return "CHALLENGE";
        default:
            throw new Error(`Invalid number ${number}`);
    }
}
