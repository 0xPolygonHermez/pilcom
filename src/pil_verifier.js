const { assert } = require("chai");
const { options } = require("yargs");
const { log2, getKs, getRoots } = require("./utils.js");

module.exports = async function verifyPil(F, pil, cmPols, constPols, config = {}) {

    const res = [];

    const refCm = {};
    const refConst = {};
    const refIm = {};
    for (let k of Object.keys(pil.references)) {
        const r  = pil.references[k];
        r.name = k;
        if (r.type == "cmP") {
            refCm[r.id] =r;
        } else if (r.type == "constP") {
            refConst[r.id] = r;
        } else if (r.type == "imP") {
            refIm[r.id] = r;
        } else {
            throw new Error("Reference type not handled: " + r.type);
        }
    }

    const pols = {
        cm: [],
        exps:[],
        const: [],
        publics: []
    };

    const N = cmPols.$$n;

    for (let i=0; i<pil.nCommitments; i++) pols.cm[i] = {};
    for (let i=0; i<pil.expressions.length; i++) pols.exps[i] = {};
    for (let i=0; i<pil.nConstants; i++) pols.const[i] = {};

// 1.- Prepare commited polynomials.
    for (let i=0; i<cmPols.$$nPols; i++) {
        pols.cm[i].v_n = cmPols.$$array[i];
    }

    for (let i=0; i<constPols.$$nPols; i++) {
        pols.const[i].v_n = constPols.$$array[i];
    }

    for (let i=0; i<pil.publics.length; i++) {

        if (config.publics) {
            pols.publics[i] = BigInt(config.publics[i]);
            console.log(`loading public[${i+1}/${pil.publics.length}] = ${pols.publics[i]}`);
        } else {
            console.log(`preparing public ${i+1}/${pil.publics.length}`);
            if (pil.publics[i].polType == "cmP") {
                pols.publics[i] = pols.cm[pil.publics[i].polId].v_n[pil.publics[i].idx];
            } else if (pil.publics[i].polType == "imP") {
                await calculateExpression(pil.publics[i].polId);
                pols.publics[i] = pols.exps[pil.publics[i].polId].v_n[pil.publics[i].idx];
                delete pols.exps[pil.publics[i].polId].v_n;
            } else {
                throw new Error(`Invalid public type: ${polType.type}`);
            }
        }
    }

    for (let i=0; i<pil.connectionIdentities.length; i++) {
        console.log(`Checking connectionIdentities ${i+1}/${pil.connectionIdentities.length}`);
        ci = pil.connectionIdentities[i];
        for (let j=0; j<ci.pols.length; j++) {
            await calculateExpression(ci.pols[j]);
        }
        for (let j=0; j<ci.connections.length; j++) {
            await calculateExpression(ci.connections[j]);
        }

        console.log("start generating cm");
        let cm = getConnectionMap(F, N, ci.pols.length);

        for (let j=0; j<ci.pols.length; j++) {
            for (let k=0; k<N; k++) {
                if (k%10000 == 0) console.log(`${k+1}/${N}`);
                const v1 = pols.exps[ci.pols[j]].v_n[k];

                const a = pols.exps[ci.connections[j]].v_n[k]
                const a1 = Number(a >> 52n);
                const a2 = Number((a >> 40n)&0xFFFn );
                const a3 = Number(a&0xFFFFFFFFFFn );


                const [cp, cw] = cm[a1][a2][a3];
                if (typeof cp == "undefined") {
                    res.push(`${ci.fileName}:${pil.connectionIdentities[i].line}: invalid copy value w=${j},${k} val=${F.toString(v1)} `);
                    console.log(res[res.length-1]);
                }
                const v2 = pols.exps[ci.pols[cp]].v_n[cw];

                if (!F.eq(v1, v2)) {
                    res.push(`${ci.fileName}:${pil.connectionIdentities[i].line}: connection does not match p1=${j} w1=${k} p2=${cp}, w2=${cw} val= ${F.toString(v1)} != ${F.toString(v2)}`);
                    console.log(res[res.length-1]);
                    k=N;
                    j=ci.pols.length;
                }
            }
        }

        for (let j=0; j<ci.pols.length; j++) {
            delete pols.exps[ci.pols[j]].v_n;
        }
        for (let j=0; j<ci.connections.length; j++) {
            delete pols.exps[ci.connections[j]].v_n;
        }

    }

    for (let i=0; i<pil.plookupIdentities.length; i++) {
        console.log(`Checking plookupIdentities ${i+1}/${pil.plookupIdentities.length}`);
        const pi =pil.plookupIdentities[i];

        for (let j=0; j<pi.t.length; j++) {
            await calculateExpression(pi.t[j]);
        }
        if (pi.selT !== null) {
            await calculateExpression(pi.selT);
        }
        for (let j=0; j<pi.f.length; j++) {
            await calculateExpression(pi.f[j]);
        }
        if (pi.selF !== null) {
            await calculateExpression(pi.selF);
        }

        let t = {};
        for (let j=0; j<N; j++) {
            const selTValue = pi.selT == null ? F.one : pols.exps[pi.selT].v_n[j];
            if (!F.isZero(selTValue)) {
                const vals = []
                for (let k=0; k<pi.t.length; k++) {
                    vals.push(F.toString(pols.exps[pi.t[k]].v_n[j]));
                }
                const v = selTValue + ':' + vals.join(",");
                t[v] = true;
            }
        }

        for (let j=0; j<N; j++) {
            const selFValue = pi.selF == null ? F.one : pols.exps[pi.selF].v_n[j];
            if (!F.isZero(selFValue)) {
                const vals = []
                for (let k=0; k<pi.f.length; k++) {
                    vals.push(F.toString(pols.exps[pi.f[k]].v_n[j]));
                }
                const v = selFValue + ':' + vals.join(",");
                if (!t[v]) {
                    res.push(`${pil.plookupIdentities[i].fileName}:${pil.plookupIdentities[i].line}:  plookup not found w=${j} values: ${v}`);
                    console.log(res[res.length-1]);
                    if (!config.continueOnError) j=N;  // Do not continue checking
                }
            }
        }

        for (let j=0; j<pi.t.length; j++) {
            delete pols.exps[pi.t[j]].v_n;
        }
        if (pi.selT !== null) {
            delete pols.exps[pi.selT].v_n;
        }
        for (let j=0; j<pi.f.length; j++) {
            delete pols.exps[pi.f[j]].v_n;
        }
        if (pi.selF !== null) {
            delete pols.exps[pi.selF].v_n;
        }

    }


    for (let i=0; i<pil.permutationIdentities.length; i++) {
        console.log(`Checking permutationIdentities ${i+1}/${pil.permutationIdentities.length}`);

        const pi =pil.permutationIdentities[i];

        for (let j=0; j<pi.t.length; j++) {
            await calculateExpression(pi.t[j]);
        }
        if (pi.selT !== null) {
            await calculateExpression(pi.selT);
        }
        for (let j=0; j<pi.f.length; j++) {
            await calculateExpression(pi.f[j]);
        }
        if (pi.selF !== null) {
            await calculateExpression(pi.selF);
        }

        let t = {};
        for (let j=0; j<N; j++) {
            const selTValue = pi.selT == null ? F.one : pols.exps[pi.selT].v_n[j];
            if (!F.isZero(selTValue)) {
                const vals = []
                for (let k=0; k<pi.t.length; k++) {
                    vals.push(F.toString(pols.exps[pi.t[k]].v_n[j]));
                }
                const v = selTValue + ':' + vals.join(",");
                t[v] = (t[v] || 0) + 1;
            }
        }

        let showRemainingErrors = true;
        for (let j=0; j<N; j++) {
            const selFValue = pi.selF == null ? F.one : pols.exps[pi.selF].v_n[j];
            if (!F.isZero(selFValue)) {
                const vals = []
                for (let k=0; k<pi.f.length; k++) {
                    vals.push(F.toString(pols.exps[pi.f[k]].v_n[j]));
                }
                const v = selFValue + ':' + vals.join(",");
                const found = t[v] ?? false;
                if (!t[v]) {
                    res.push(`${pi.fileName}:${pi.line}:  permutation not `+(found === 0 ? 'enought ':'')+`found w=${j} values: ${v}`);
                    console.log(res[res.length-1]);
                    if (!config.continueOnError) {
                        j=N;  // Do not continue checking
                        showRemainingErrors = false;
                    }
                }
                else {
                    t[v] -= 1;
                }
            }
        }
        if (showRemainingErrors) {
            for (const v in t) {
                if (t[v] === 0) continue;
                res.push(`${pi.fileName}:${pi.line}:  permutation failed. Remaining ${t[v]} values: ${v}`);
                console.log(res[res.length-1]);
            }
        }

        for (let j=0; j<pi.t.length; j++) {
            delete pols.exps[pi.t[j]].v_n;
        }
        if (pi.selT !== null) {
            delete pols.exps[pi.selT].v_n;
        }
        for (let j=0; j<pi.f.length; j++) {
            delete pols.exps[pi.f[j]].v_n;
        }
        if (pi.selF !== null) {
            delete pols.exps[pi.selF].v_n;
        }

    }

    for (let i=0; i<pil.polIdentities.length; i++) {
        console.log(`Checking identities ${i+1}/${pil.polIdentities.length}`);
        await calculateExpression(pil.polIdentities[i].e);

        for (let j=0; j<N; j++) {
            const v = pols.exps[pil.polIdentities[i].e].v_n[j]
            if (!F.isZero(v)) {
                res.push(`${pil.polIdentities[i].fileName}:${pil.polIdentities[i].line}: identity does not match w=${j} val=${F.toString(v)} `);
                console.log(res[res.length-1]);
                if (!config.continueOnError) j=N;
            }
        }

        delete pols.exps[pil.polIdentities[i].e].v_n;
    }


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
            for (let i=0; i<a.length; i++) r[i] = F.add(a[i], b[i]);
        } else if (exp.op == "sub") {
            a = eval(exp.values[0]);
            b = eval(exp.values[1]);
            r = new Array(a.length);
            for (let i=0; i<a.length; i++) r[i] = F.sub(a[i], b[i]);
        } else if (exp.op == "mul") {
            a = eval(exp.values[0]);
            b = eval(exp.values[1]);
            r = new Array(a.length);
            for (let i=0; i<a.length; i++) r[i] = F.mul(a[i], b[i]);
        } else if (exp.op == "addc") {
            a = eval(exp.values[0]);
            c = F.e(exp.const);
            r = new Array(a.length);
            for (let i=0; i<a.length; i++) r[i] = F.add(a[i], c);
        } else if (exp.op == "mulc") {
            a = eval(exp.values[0]);
            c = F.e(exp.const);
            r = new Array(a.length);
            for (let i=0; i<a.length; i++) r[i] = F.mul(a[i], c);
        } else if (exp.op == "neg") {
            a = eval(exp.values[0]);
            r = new Array(a.length);
            for (let i=0; i<a.length; i++) r[i] = F.neg(a[i]);
        } else if (exp.op == "cm") {
            r = pols.cm[exp.id].v_n;
            if (exp.next) r = getPrime(r);
        } else if (exp.op == "const") {
            r = pols.const[exp.id].v_n;
            if (exp.next) r = getPrime(r);
        } else if (exp.op == "exp") {
            r = pols.exps[exp.id].v_n;
            if (exp.next) r = getPrime(r);
        } else if (exp.op == "number") {
            v = F.e(exp.value);
            r = new Array(N);
            for (let i=0; i<N; i++) r[i] = v;
        } else if (exp.op == "public") {
            r = new Array(N);
            for (let i=0; i<N; i++) r[i] = pols.publics[exp.id];
        } else {
            throw new Error(`Invalid op: ${exp.op}`);
        }

        return r;
    }


    function getPrime(p) {
        const r = p.slice(1);
        r[p.length-1] = p[0];
        return r;
    }


    async function calculateExpression(expId) {
        console.log("calculateExpression: "+ expId);

        if ((pols.exps[expId])&&(pols.exps[expId].v_n)) return pols.exps[expId].v_n;

        await calculateDependencies(pil.expressions[expId]);

        const p = eval(pil.expressions[expId]);

        pols.exps[expId].v_n = p;
        return pols.exps[expId].v_n;
    }

    async function calculateDependencies(exp) {
        if (exp.op == "exp") {
            await calculateExpression(exp.id);
        }
        if (exp.values) {
            for (let i=0; i<exp.values.length; i++) {
                await calculateDependencies(exp.values[i]);
            }
        }
    }
}


const cacheConnectionMaps = {};

function getConnectionMap(F, N, nk) {
    const kc = F.p.toString()+ "_" + N.toString() + "_" + nk.toString();
    if (cacheConnectionMaps[kc]) return cacheConnectionMaps[kc];

    const pow = log2(N);

    const m = new Array(1<<16);
    const ks = [1n, ...getKs(F, nk-1)];
    let w = F.one;
    const roots = getRoots(F);
    const wi = roots[pow];
    for (let i=0; i<N; i++ ) {
        if ((i%10000) == 0) console.log(`Building cm.. ${i}/${N}`);
        for (j=0; j<ks.length; j++) {
            const a = F.mul(ks[j], w);
            const a1 = Number(a >> 52n);
            const a2 = Number((a >> 40n)&0xFFFn );
            const a3 = Number(a&0xFFFFFFFFFFn );
            if (!m[a1]) m[a1] = new Array(1<<16);
            if (!m[a1][a2]) m[a1][a2] = {};
            m[a1][a2][a3] = [j, i];
        }
        w = F.mul(w, wi);
    }

    cacheConnectionMaps[kc] = m;
    return m;
}