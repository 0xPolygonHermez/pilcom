const path = require("path");
const fs = require("fs");
const pil_parser = require("../build/pil_parser.js").parser;
const Scalar = require("ffjavascript").Scalar;

module.exports = async function compile(Fr, fileName, ctx) {

    let isMain;
    if (!ctx) {
        ctx = {
            references: {},
            publics:{},
            nCommitments: 0,
            nConstants: 0,
            nIm: 0,
            nQ: 0,
            nPublic: 0,
            expressions: [],
            polIdentities: [],
            plookupIdentities: [],
            namespace: "GLOBAL",
            constants: {},
            Fr: Fr
        }
        isMain = true;
    } else {
        isMain = false;
    }

    const fullFileName = path.resolve(process.cwd(), fileName);
    const fileDir = path.dirname(fullFileName);

    const src = await fs.promises.readFile(fullFileName, "utf8") + "\n";

    const sts = pil_parser.parse(src);

    let pendingCommands = [];
    let lastLineAllowsCommand = false;

    for (let i=0; i<sts.length; i++) {
        const s = sts[i];
        s.fileName = fileName;
        if (s.type == "INCLUDE") {
            const fullFileNameI = path.resolve(fileDir, s.file);
            const oldNamespace = ctx.namespace;
            ctx.namespace = "GLOBAL";
            await compile(Fr, fullFileNameI, ctx);
            ctx.namespace = oldNamespace;
            if (pendingCommands.length>0) error(s, "command not allowed before include");
            lastLineAllowsCommand = false;
        } else if (s.type == "NAMESPACE") {
            ctx.namespace = s.namespace;
            const se = simplifyExpression(Fr, ctx, s.exp);
            if (se.op != "number") error(s, "Size is not constant expression");
            ctx.polDeg = Number(se.value);
        } else if (s.type == "POLCOMMTDECLARATION") {
            for (let j=0; j<s.names.length; j++) {
                if (ctx.references[ctx.namespace + "." + s.names[j].name]) error(s, `name already defined ${ctx.namespace + "." +s.names[j]}`);
                if  (s.names[j].type == "array") {
                    const se = simplifyExpression(Fr, ctx, s.names[j].expLen);
                    if (se.op != "number") error(s, "Array Size is not constant expression");
                    ctx.references[ctx.namespace + "." + s.names[j].name] = {
                        type: "cmP",
                        elementType: s.elementType,
                        id: ctx.nCommitments,
                        polDeg: ctx.polDeg,
                        isArray: true,
                        len: Number(se.value)
                    }
                    ctx.nCommitments += Number(se.value);
                } else {
                    ctx.references[ctx.namespace + "." + s.names[j].name] = {
                        type: "cmP",
                        elementType: s.elementType,
                        id: ctx.nCommitments,
                        polDeg: ctx.polDeg,
                        isArray: false,
                    }
                    ctx.nCommitments += 1;
                }
            }
        } else if (s.type == "POLCONSTANTDECLARATION") {
            for (let j=0; j<s.names.length; j++) {
                if (ctx.references[ctx.namespace + "." + s.names[j].name]) error(s, `name already defined ${ctx.namespace + "." + s.names[j]}`);
                if  (s.names[j].type == "array") {
                    const se = simplifyExpression(Fr, ctx, s.names[j].expLen);
                    if (se.op != "number") error(s, "Array Size is not constant expression");
                    ctx.references[ctx.namespace + "." + s.names[j].name] = {
                        type: "constP",
                        elementType: s.elementType,
                        id: ctx.nConstants,
                        polDeg: ctx.polDeg,
                        isArray: true,
                        len: Number(se.value)
                    }
                    ctx.nConstants += Number(se.value);
                } else {
                    ctx.references[ctx.namespace + "." + s.names[j].name] = {
                        type: "constP",
                        elementType: s.elementType,
                        id: ctx.nConstants,
                        polDeg: ctx.polDeg,
                        isArray: false,
                    }
                    ctx.nConstants += 1;
                }
            }
        } else if (s.type == "POLDEFINITION") {
            const eidx = ctx.expressions.length;
            addFilename(s.expression, fileName, ctx.namespace);
            ctx.expressions.push(s.expression);
            if (ctx.references[ctx.namespace + "." + s.name]) error(s, `name already defined ${ctx.namespace + "." + s.name}`);
            ctx.references[ctx.namespace + "." + s.name] = {
                type: "imP",
                id: eidx,
                polDeg: ctx.polDeg
            }
            ctx.nIm++;
        } else if (s.type == "POLIDENTITY") {
            const eidx = ctx.expressions.length;
            addFilename(s.expression, fileName, ctx.namespace);
            ctx.expressions.push(s.expression);
            ctx.polIdentities.push({fileName: fileName, namespace: ctx.namespace, line: s.first_line, e: eidx});
        } else if (s.type == "PLOOKUPIDENTITY") {
            const pu = {
                fileName: fileName, 
                namespace: ctx.namespace,
                line: s.first_line,
                f: [],
                t: [],
                selF: null,
                selT: null
            }
            for (let j=0; j<s.f.length; j++) {
                const efidx = ctx.expressions.length;
                addFilename(s.f[j], fileName, ctx.namespace);
                ctx.expressions.push(s.f[j]);
                pu.f.push(efidx);
            }
            if (s.selF) {
                const selFidx = ctx.expressions.length;
                addFilename(s.selF, fileName, ctx.namespace);
                ctx.expressions.push(s.selF);
                pu.selF = selFidx;
            }
            for (let j=0; j<s.t.length; j++) {
                const etidx = ctx.expressions.length;
                addFilename(s.t[j], fileName, ctx.namespace);
                ctx.expressions.push(s.t[j]);
                pu.t.push(etidx);
            }
            if (s.selT) {
                const selTidx = ctx.expressions.length;
                addFilename(s.selT, fileName, ctx.namespace);
                ctx.expressions.push(s.selT);
                pu.selT = selTidx;
            }
            ctx.plookupIdentities.push(pu);
        } else if (s.type == "PUBLICDECLARATION") {
            if (ctx.publics[s.name]) error(s, `name already defined ${s.name}`);
            let ns = s.pol.namespace;
            if (ns == "this") ns = ctx.namespace;
            if (typeof ctx.references[ns + "." + s.pol.name] == "undefined" ) error(s, `polyomial not defined ${ns + "." +s.pol.name}`);
            if ((s.pol.idxExp) && (!ctx.references[ns + "." + s.pol.name].isArray)) error(s, `${ns + "." + s.pol.name} is not an Array`);
            if ((!s.pol.idxExp) && (ctx.references[ns + "." + s.pol.name].isArray)) error(s, `${ns + "." + s.pol.name}: index of an array not specified`);
            let offset;
            if ((s.pol.idxExp) && (ctx.references[ns + "." + s.pol.name].isArray)) {
                const se = simplifyExpression(Fr, ctx, s.pol.idxExp);
                if (se.op != "number") error(s, "Index is not constant expression");
                offset = Number(se.value);
            } else {
                offset = 0;
            }
            ctx.publics[s.name] = {
                polType: ctx.references[ns + "." + s.pol.name].type,
                polId: Number(ctx.references[ns + "." + s.pol.name].id) + offset,
                idx: Number(s.idx),
                id: ctx.nPublic++
            };
        } else if (s.type == "CONSTANTDEF") {
            if (ctx.constants[s.name]) error(s, `name already defined ${s.name}`);
            const se = simplifyExpression(Fr, ctx, s.exp);
            if (se.op != "number") error(s, "Not a constant expression");
            ctx.constants[s.name] = se.value;
        } else {
            error(s, `Invalid line type: ${s.type}`);
        }
    }

    if (isMain) {
        for (let i=0; i<ctx.polIdentities.length; i++) {
            ctx.namespace = ctx.polIdentities[i].namespace;
            ctx.expressions[ctx.polIdentities[i].e] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.polIdentities[i].e]);
        }
        for (let i=0; i<ctx.plookupIdentities.length; i++) {
            ctx.namespace = ctx.plookupIdentities[i].namespace;
            for (j=0; j<ctx.plookupIdentities[i].f.length; j++) {
                ctx.expressions[ctx.plookupIdentities[i].f[j]] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].f[j]]);
            } 
            if (ctx.plookupIdentities[i].selF !== null) {
                ctx.expressions[ctx.plookupIdentities[i].selF] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].selF]);
            }
            for (j=0; j<ctx.plookupIdentities[i].t.length; j++) {
                ctx.expressions[ctx.plookupIdentities[i].t[j]] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].t[j]]);
            } 
            if (ctx.plookupIdentities[i].selT !== null) {
                ctx.expressions[ctx.plookupIdentities[i].selT] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].selT]);
            }
        }
        for (let i=0; i<ctx.expressions.length; i++) {
            if (!ctx.expressions[i].simplified) error(ctx.expressions[i], "Unused expression");
            if (!ctx.expressions[i].deg>2) error(ctx.expressions[i], "Degree greater than 2");
        }
        for (let i=0; i<ctx.polIdentities.length; i++) {
            reduceto2(ctx, ctx.expressions[ctx.polIdentities[i].e]);
        }
        for (let i=0; i<ctx.plookupIdentities.length; i++) {
            for (j=0; j<ctx.plookupIdentities[i].f.length; j++) {
                reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].f[j]]);
            }
            if (ctx.plookupIdentities[i].selF) {
                reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].selF]);
            }
            for (j=0; j<ctx.plookupIdentities[i].t.length; j++) {
                reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].t[j]]);
            }
            if (ctx.plookupIdentities[i].selT) {
                reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].selT]);
            }
        }
    }

    if (isMain) {
        return ctx2json(ctx);
    }
}

function error(l, err) {
    if (err instanceof Error) {
        err.message = `ERROR ${l.fileName}:${l.first_line}: ${err.message}`
        throw(err);
    } else { 
        const msg = `ERROR ${l.fileName}:${l.first_line}: ${err}`;
        throw new Error(msg);
    }
}

function simplifyExpression(Fr, ctx, e) {
    if (e.simplified) return e;
    e.simplified = true;
    if (e.op == "pol") {
        const ref = ctx.references[e.namespace + '.' + e.name];
        if (!ref) error(e, `polinomial ${e.namespace + '.' + e.name} not defined`);
        if ((ref.type == "cmP") || (ref.type == "constP")) {
            e.deg = 1;
        } else if (ref.type == "imP") {
            ctx.expressions[ref.id] = simplifyExpression(Fr, ctx, ctx.expressions[ref.id]);
            reduceto1(ctx, ctx.expressions[ref.id]);
            e.deg = 1;
        } else {
            throw new Error(`Invalid reference type: ${ref.type}`);
        }
        return e;
    }
    if (e.op == "number") {
        e.deg = 0;
        return e;
    }
    if (e.op == "public") {
        const ref = ctx.publics[e.name];
        if (!ref) error(e, `public ${e.name} not defined`);
        e.id = ref.id;
        e.deg = 0;
        return e;
    }    
    if (e.op == "neg") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        if (a.op == "number") {
            return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.neg(Fr.e(a.value))), first_line: e.first_line}
        } else {
            e.deg = a.deg;
            return e;
        }
    }
    if (e.op == "add") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        e.values[1] = simplifyExpression(Fr, ctx, e.values[1]);
        const b = e.values[1];
        if (a.op == "number") {
            if (b.op == "number") {
                return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.add(Fr.e(a.value), Fr.e(b.value))), first_line: e.first_line}
            } else {
                if (Fr.isZero(Fr.e(a.value))) {
                    return b;
                } else {
                    return {simplified:true, op: "addc", deg:b.deg, const: a.value, values: [b], first_line: e.first_line}
                }
            }
        } else {
            if (b.op == "number") {
                if (Fr.isZero(Fr.e(b.value))) {
                    return a;
                } else {
                    return {simplified:true, op: "addc", deg:a.deg, const: b.value, values: [a], first_line: e.first_line}
                }
            } else {
                e.deg = Math.max(a.deg, b.deg);
                return e;
            }
        }
    }
    if (e.op == "sub") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        e.values[1] = simplifyExpression(Fr, ctx, e.values[1]);
        const b = e.values[1];
        if (a.op == "number") {
            if (b.op == "number") {
                return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.sub(Fr.e(a.value), Fr.e(b.value)))}
            } else {
                if (Fr.isZero(Fr.e(a.value))) {
                    return {simplified:true, op:"neg", deg:b.deg, values: [b], first_line: e.first_line};
                } else {
                    return {simplified:true, op: "addc", deg: b.deg, const: a.value, values: [{op:"neg", deg:b.deg, values: [b]}], first_line: e.first_line};
                }
            }
        } else {
            if (b.op == "number") {
                if (Fr.isZero(Fr.e(b.value))) {
                    return a;
                } else {
                    return {simplified:true, op: "addc", deg:a.deg, const: Fr.toString(Fr.neg(Fr.e(b.value))), values: [a], first_line: e.first_line};
                }
            } else {
                e.deg = Math.max(a.deg, b.deg);
                return e;
            }
        }
    }
    if (e.op == "mul") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        e.values[1] = simplifyExpression(Fr, ctx, e.values[1]);
        const b = e.values[1];
        if (a.op == "number") {
            if (b.op == "number") {
                return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.mul(Fr.e(a.value), Fr.e(b.value))), first_line: e.first_line}
            } else {
                if (Fr.isZero(Fr.e(a.value))) {
                    return {op: "number", simplified: true, deg: 0, value: "0", first_line: e.first_line};
                } else if (Fr.eq(Fr.e(a.value), Fr.one)) {
                    return b;
                } else {
                    return {simplified:true, op: "mulc", deg:b.deg, const: a.value, values: [b], first_line: e.first_line}
                }
            }
        } else {
            if (b.op == "number") {
                if (Fr.isZero(Fr.e(b.value))) {
                    return {op: "number", simplified: true, deg: 0, value: "0", first_line: e.first_line};
                } else if (Fr.eq(Fr.e(b.value), Fr.one)) {
                    return a;
                } else {
                    return {simplified:true, op: "mulc", deg:a.deg, const: b.value, values: [a], first_line: e.first_line}
                }
            } else {
                e.deg = a.deg +  b.deg;
                return e;
            }
        }
    }
    if (e.op == "pow") {
        e.values[0] = simplifyExpression(Fr, ctx, e.values[0]);
        const a = e.values[0];
        e.values[1] = simplifyExpression(Fr, ctx, e.values[1]);
        const b = e.values[1];
        if ((a.op == "number") && (b.op == "number")) {
            return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.exp(Fr.e(a.value), Scalar.e(b.value))), first_line: e.first_line}
        } else {
            error(e, "Exponentiation can only be applied between constants");
        }
    }
    if (e.op == "constant") {
        return {simplified:true, op: "number", deg:0, value: ctx.constants[e.name]};
    }

    error(e, `invalid operation: ${e.op}`);
}

function addFilename(exp, fileName, namespace) {
    exp.fileName = fileName;
    if (exp.namespace === "this") exp.namespace = namespace;
    if (exp.values) {
        for(let i=0; i<exp.values.length; i++) addFilename(exp.values[i], fileName, namespace);
    }
}

function reduceto2(ctx, e) {
    if (e.deg>2) error(e, "Degre too high");
}

function reduceto1(ctx, e) {
    if (e.deg==1) return;
    if (e.deg>2) error(e, "Degre too high");
    e.idQ = ctx.nQ++
    e.deg = 1;
}

// Commitmets
// Qs
// Const
// Im


function ctx2json(ctx) {
    const out={
        nCommitments: ctx.nCommitments,
        nQ: ctx.nQ,
        nIm: ctx.nIm,
        nConstants: ctx.nConstants,
        publics: [], 
        references: {},
        expressions: [],
        polIdentities: [],
        plookupIdentities: [],
    };

    for (n in ctx.references) {
        if (ctx.references.hasOwnProperty(n)) {  
            const ref = ctx.references[n];
            if (ref.isArray) {
                out.references[n] = {
                    type: ref.type,
                    elementType: ref.elementType,
                    id: ref.id,
                    polDeg: ref.polDeg,
                    isArray: true,
                    len: ref.len
                };
            } else {
                out.references[n] = {
                    type: ref.type,
                    elementType: ref.elementType,
                    id: ref.id,
                    polDeg: ref.polDeg,
                    isArray: false
                };
            }
        }
    }

    for (n in ctx.publics) {
        if (ctx.publics.hasOwnProperty(n)) {  
            const pub = ctx.publics[n];
            out.publics[pub.id] = pub;
            out.publics[pub.id].name = n;
        }
    }

    for (let i=0; i<ctx.expressions.length; i++) {
        out.expressions.push(expression2JSON(ctx, ctx.expressions[i]));
    }

    for (let i=0; i<ctx.polIdentities.length; i++) {
        out.polIdentities.push({
            e: ctx.polIdentities[i].e,
            fileName: ctx.polIdentities[i].fileName,
            line: ctx.polIdentities[i].line
        });
    }

    for (let i=0; i<ctx.plookupIdentities.length; i++) {
        const pu = {};
        pu.f = ctx.plookupIdentities[i].f;
        pu.t = ctx.plookupIdentities[i].t;
        pu.selF = ctx.plookupIdentities[i].selF;
        pu.selT = ctx.plookupIdentities[i].selT;
        pu.fileName = ctx.plookupIdentities[i].fileName;
        pu.line = ctx.plookupIdentities[i].line;
        out.plookupIdentities.push(pu);
    }

    return out;
}

function expression2JSON(ctx, e, deps) {
    let main = false;
    if (!deps) {
        deps = [];
        main = true;
    }
    const out = {
        op: e.op
    }
    out.deg = e.deg;
    if (e.op == "pol") {
        const ref = ctx.references[e.namespace + '.' + e.name];
        if (!ref) error(e,  `${e.namespace + "." + e.name} reference not defned`);
        if ((e.idxExp) && (!ctx.references[e.namespace + "." + e.name].isArray)) error(e, `${e.namespace + "." + e.name} is not an Array`);
        if ((!e.idxExp) && (ctx.references[e.namespace + "." + e.name].isArray)) error(e, `${e.namespace + "." + e.name}: index of an array not specified`);
        let offset;
        if ((e.idxExp) && (ctx.references[e.namespace + "." + e.name].isArray)) {
            const se = simplifyExpression(ctx.Fr, ctx, e.idxExp);
            if (se.op != "number") error(e, "Index is not constant expression");
            offset = Number(se.value);
        } else {
            offset = 0;
        }
        if (ref.type=="cmP") {
            out.id = Number(ref.id)+offset;
            out.op = "cm";
        } else if (ref.type=="constP") {
            out.id = Number(ref.id)+offset;
            out.op = "const"
        } else if (ref.type=="imP") {
            if (offset != 0) error(e, "Intermediate cannot have an offset")
            if (!main) {
                deps.push(ref.id);
            }
            out.id = ref.id;
            out.op = "exp"
        }
        out.next = e.next;
    }
    if (e.op == "public") {
        const ref = ctx.publics[e.name];
        out.id = ref.id;
        out.op = "public";
    }
    if (typeof e.idQ != "undefined") out.idQ = e.idQ;
    if (typeof e.values != "undefined") {
        out.values = [];
        for (let i=0; i<e.values.length; i++) {
            out.values.push( expression2JSON(ctx, e.values[i], deps));
        }
    }
    if (typeof e.value !== "undefined") {
        out.value = e.value;
    }
    if (typeof e.const !== "undefined") {
        out.const = e.const;
    }
    if ((main)&&(deps.length>0)) out.deps = deps;
    return out;
}
