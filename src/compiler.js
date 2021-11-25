const path = require("path");
const fs = require("fs");
const pil_parser = require("../build/pil_parser.js").parser;

module.exports = async function compile(Fr, fileName, ctx) {

    let isMain;
    if (!ctx) {
        ctx = {
            references: {},
            nCommitments: 0,
            nConstants: 0,
            nIm: 0,
            nQ: 0,
            expressions: [],
            polIdentities: [],
            plookupIdentities: [],
            namespace: "GLOBAL",
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
        } else if (s.type == "POLCOMMTEDDECLARATION") {
            for (let j=0; j<s.names.length; j++) {
                if (ctx.references[ctx.namespace + "." + s.names[j]]) error(s, `name already defined ${ctx.namespace + "." +s.names[j]}`);
                ctx.references[ctx.namespace + "." + s.names[j]] = {
                    type: "cmP",
                    elementType: s.elementType,
                    id: ctx.nCommitments++
                }
            }
        } else if (s.type == "POLCONSTANTDECLARATION") {
            for (let j=0; j<s.names.length; j++) {
                if (ctx.references[ctx.namespace + "." + s.names[j]]) error(s, `name already defined ${ctx.namespace + "." + s.names[j]}`);
                ctx.references[ctx.namespace + "." + s.names[j]] = {
                    type: "constP",
                    elementType: s.elementType,
                    id: ctx.nConstants++
                }
            }
        } else if (s.type == "POLDEFINITION") {
            const eidx = ctx.expressions.length;
            addFilename(s.expression, fileName, ctx.namespace);
            ctx.expressions.push(s.expression);
            if (ctx.references[ctx.namespace + "." + s.name]) error(s, `name already defined ${ctx.namespace + "." + s.name}`);
            ctx.references[ctx.namespace + "." + s.name] = {
                type: "imP",
                id: eidx
            }
            ctx.nIm++;
        } else if (s.type == "POLIDENTITY") {
            const eidx = ctx.expressions.length;
            addFilename(s.expression, fileName, ctx.namespace);
            ctx.expressions.push(s.expression);
            ctx.polIdentities.push({fileName: fileName, namespace: ctx.namespace, e: eidx});
        } else if (s.type == "PLOOKUPIDENTITY") {
            const efidx = ctx.expressions.length;
            addFilename(s.f, fileName, ctx.namespace);
            ctx.expressions.push(s.f);
            const etidx = ctx.expressions.length;
            addFilename(s.t, fileName, ctx.namespace);
            ctx.expressions.push(s.t);
            ctx.plookupIdentities.push({fileName: fileName, namespace: ctx.namespace, f: efidx, t: etidx});
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
            ctx.expressions[ctx.plookupIdentities[i].f] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].f]);
            ctx.expressions[ctx.plookupIdentities[i].t] = simplifyExpression(Fr, ctx, ctx.expressions[ctx.plookupIdentities[i].t]);
        }
        for (let i=0; i<ctx.expressions.length; i++) {
            if (!ctx.expressions[i].simplified) error(ctx.expressions[i], "Unused expression");
            if (!ctx.expressions[i].deg>2) error(ctx.expressions[i], "Degree greater than 2");
        }
        for (let i=0; i<ctx.polIdentities.length; i++) {
            reduceto2(ctx, ctx.expressions[ctx.polIdentities[i].e]);
        }
        for (let i=0; i<ctx.plookupIdentities.length; i++) {
            reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].f]);
            reduceto1(ctx, ctx.expressions[ctx.plookupIdentities[i].t]);
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
        if (!ref) error(e, `polynomial ${e.namespace + '.' + e.name} not defined`);
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
                    return {simplified:true, op: "addc", deg:a.deg, const: b.value, value: [a], first_line: e.first_line}
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
                    return {simplified:true, op: "addc", deg: b.deg, const: a.value, value: {op:"neg", deg:b.deg, values: [b]}, first_line: e.first_line};
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
                    return {simplified:true, op: "mulc", deg:a.deg, const: b.value, value: [a], first_line: e.first_line}
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
            return {simplified:true, op: "number", deg:0, value: Fr.toString(Fr.exp(Fr.e(a.value), Fr.e(b.value))), first_line: e.first_line}
        } else {
            error(e, "Exponentiation can only be applied between constants");
        }
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
        references: {},
        expressions: [],
        polIdentities: [],
        plookupIdentities: [],
    };

    for (n in ctx.references) {
        if (ctx.references.hasOwnProperty(n)) {  
            const ref = ctx.references[n];
            out.references[n] = {
                type: ref.type,
                elementType: ref.elementType,
                id: ref.id   
            };
        }
    }

    for (let i=0; i<ctx.expressions.length; i++) {
        out.expressions.push(expression2JSON(ctx, ctx.expressions[i]));
    }

    for (let i=0; i<ctx.polIdentities.length; i++) {
        out.polIdentities.push(ctx.polIdentities[i].e);
    }

    for (let i=0; i<ctx.plookupIdentities.length; i++) {
        out.plookupIdentities.push([ctx.plookupIdentities[i].f, ctx.plookupIdentities[i].t]);
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
    if (e.op == "pol") {
        const ref = ctx.references[e.namespace + '.' + e.name];
        if (ref.type=="cmP") {
            out.id = ref.id;
            out.op = "cm";
        } else if (ref.type=="constP") {
            out.id = ref.id;
            out.op = "const"
        } else if (ref.type=="imP") {
            if (!main) {
                deps.push(ref.id);
            }
            out.id = ref.id;
            out.op = "exp"
        }
        out.next = e.next;
    }
    if (e.idQ) out.idQ = e.idQ;
    if (typeof e.values != "undefined") {
        out.values = [];
        for (let i=0; i<e.values.length; i++) {
            out.values.push( expression2JSON(ctx, e.values[i], deps));
        }
    }
    if (typeof e.const !== "undefined") {
        out.const = e.const;
    }
    if ((main)&&(deps.length>0)) out.deps = deps;
    return out;
}
