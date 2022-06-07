#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const version = require("../package").version;
const compile = require("./compiler.js");
const ffjavascript = require("ffjavascript");

const argv = require("yargs")
    .version(version)
    .usage("pil <source.pil> -o <output.json>")
    .alias("o", "output")
    .alias("c", "ccodegeneration")
    .argv;

async function run() {
    let inputFile;
    if (argv._.length == 0) {
        console.log("Only one circuit at a time is permited");
        process.exit(1);
    } else if (argv._.length == 1) {
        inputFile = argv._[0];
    } else  {
        console.log("You need to specify a source file");
        process.exit(1);
    }

    const fullFileName = path.resolve(process.cwd(), inputFile);
    const fileName = path.basename(fullFileName, ".zkasm");

    const outputFile = typeof(argv.output) === "string" ?  argv.output : fileName + ".json";

    const cCodeGeneration = argv.ccodegeneration;

    /*
    const bn128 = await ffjavascript.getCurveFromName("bn128");
    const F = bn128.Fr;
    */

    const F = new ffjavascript.F1Field((1n<<64n)-(1n<<32n)+1n );

    const out = await compile(F, fullFileName);

    console.log(JSON.stringify(out, null, 1));
    
    console.log("Input Pol Commitmets: " + out.nCommitments);
    console.log("Q Pol Commitmets: " + out.nQ);
    console.log("Constant Pols: " + out.nConstants);
    console.log("Im Pols: " + out.nIm);
    console.log("plookupIdentities: " + out.plookupIdentities.length);
    console.log("permutationIdentities: " + out.permutationIdentities.length);
    console.log("connectionIdentities: " + out.connectionIdentities.length);
    console.log("polIdentities: " + out.polIdentities.length);

    await fs.promises.writeFile(outputFile.trim(), JSON.stringify(out, null, 1) + "\n", "utf8");
    
    if (cCodeGeneration)
    {
        await fs.promises.writeFile("commit_pols.hpp", generateCCode(out, "cmP"), "utf8");
        await fs.promises.writeFile("constant_pols.hpp", generateCCode(out, "constP"), "utf8");
    }
}

run().then(()=> {
    process.exit(0);
}, (err) => {
//    console.log(err);
    console.log(err.stack);
    if (err.pos) {
        console.error(`ERROR at ${err.errFile}:${err.pos.first_line},${err.pos.first_column}-${err.pos.last_line},${err.pos.last_column}   ${err.errStr}`);
    } else {
        console.log(err.message);
    }
    process.exit(1);
});

function generateCCode(pols, type) {

    let code = "";

    // List all cmP pols namespaces
    let namespaces = [];
    for (var key in pols.references) {
        var pol = pols.references[key];
        if (pol.type == type) {
            const stringArray = key.split(".");
            const namespace = stringArray[0];
            for (var i=0; i<namespaces.length; i++) {
                if (namespaces[i] == namespace) break;
            }
            if (i==namespaces.length) {
                namespaces[namespaces.length] = namespace;
            }
        }
    }

    
    let declaration = [];
    let initialization = [];
    let degree = [];
    let offset = 0;
    let offset_transpositioned = 0;
    let localOffset = [];
    let localInitialization = [];

    // Init the declaration and initialization arrays
    for (var i=0; i<namespaces.length; i++) {
        declaration[i] = "";
        initialization[i] = "";
        localOffset[i] = 0;
        localInitialization[i] = "";
    }

    // Calculate the number of polynomials of the requested type and the sufix
    var numPols = 0;
    var sufix = "";
    var fileDefine = "";
    if (type == "cmP") {
        numPols = pols.nCommitments;
        sufix = "Commit";
        fileDefine = "COMMIT_POLS_HPP";
    } else if (type == "constP") {
        numPols = pols.nConstants;
        sufix = "Constant";
        fileDefine = "CONSTANT_POLS_HPP";
    }

    code += "#ifndef " + fileDefine + "\n";
    code += "#define " + fileDefine + "\n";
    code += "\n";
    code += "#include <cstdint>\n";
    code += "#include \"ff/ff.hpp\"\n";
    code += "\n";

    code += "class GeneratedPol\n";
    code += "{\n";
    code += "private:\n";
    code += "    FieldElement * pData;\n";
    code += "public:\n";
    code += "    GeneratedPol() : pData(NULL) {};\n";
    //code += "    void Init (FieldElement * pAddress) { pData = pAddress; };\n";
    //code += "    FieldElement operator[](int i) { return pData[i]; };\n";
    code += "    FieldElement & operator[](int i) { return pData[i*" + numPols + "]; };\n";
    code += "    FieldElement * operator=(FieldElement * pAddress) { pData = pAddress; return pData; };\n";
    code += "};\n\n";

    // For each cmP pol, add it to the proper namespace array
    for (var i = 0; i < numPols; i++) {
        for (var key in pols.references) {
            var pol = pols.references[key];
            if ( (pol.type == type) && (pol.id==i) ) {
                const nameArray = key.split(".");
                const name = nameArray[1];
                let namespaceId = 0;
                for (; namespaceId<namespaces.length; namespaceId++) {
                    if (namespaces[namespaceId]==nameArray[0]) {
                        break;
                    }
                }
                let ctype = "";
                let csize = 0;
                /*if (pol.elementType=="field") { ctype="FieldElement"; csize=8; }
                else if (pol.elementType=="u8") { ctype="uint8_t"; csize=1; }
                else if (pol.elementType=="u16") { ctype="uint16_t"; csize=2; }
                else if (pol.elementType=="u32") { ctype="uint32_t"; csize=4; }
                else if (pol.elementType=="u64") { ctype="uint64_t"; csize=8; }
                else if (pol.elementType=="s8") { ctype="int8_t"; csize=1; }
                else if (pol.elementType=="s16") { ctype="int16_t"; csize=2; }
                else if (pol.elementType=="s32") { ctype="int32_t"; csize=4; }
                else if (pol.elementType=="s64") { ctype="int64_t"; csize=8; }
                else if (pol.elementType=="bool") { ctype="uint8_t"; csize=1; }
                else {
                    console.log("elementType="+pol.elementType);
                }*/
                ctype="FieldElement";
                csize=8;

                let array = "";
                if (pol.isArray) {
                    array="["+pol.len+"]";
                }
                //declaration[namespaceId] += "    " + ctype + " * " + name + array + ";\n";
                declaration[namespaceId] += "    GeneratedPol " + name + array + ";\n";
                if (pol.isArray) {
                    for (var a = 0; a < pol.len; a++) {
                        initialization[namespaceId] += "        " + name + "[" + a + "] = (" + ctype + " *)((uint8_t *)pAddress + " + offset_transpositioned + ");\n";
                        localInitialization[namespaceId] += "        " + name + "[" + a + "] = (" + ctype + " *)((uint8_t *)pAddress + " + localOffset[namespaceId] + "*degree);\n";
                        offset += csize*pol.polDeg;
                        offset_transpositioned += csize;
                        localOffset[namespaceId] += csize;
                    }
                } else {
                    initialization[namespaceId] += "        " + name + " = (" + ctype + " *)((uint8_t *)pAddress + " + offset_transpositioned + ");\n"
                    localInitialization[namespaceId] += "        " + name + " = (" + ctype + " *)((uint8_t *)pAddress + " + localOffset[namespaceId] + "*degree);\n"
                    offset += csize*pol.polDeg;
                    offset_transpositioned += csize;
                    localOffset[namespaceId] += csize;
                }
                degree[namespaceId] = pol.polDeg;
                break;
            }
        }
    }
    for (var i=0; i<namespaces.length; i++) {
        code += "class " + namespaces[i] + sufix + "Pols\n";
        code += "{\n";
        code += "public:\n";
        code += declaration[i];
        code += "\n";
        code += "    " + namespaces[i] + sufix + "Pols (void * pAddress)\n";
        code += "    {\n";
        code += initialization[i];
        code += "    }\n";
        code += "\n";
        code += "    " + namespaces[i] + sufix + "Pols (void * pAddress, uint64_t degree)\n";
        code += "    {\n";
        code += localInitialization[i];
        code += "    }\n";
        code += "\n";
        code += "    static uint64_t degree (void) { return " + degree[i] + "; }\n"
        code += "    static uint64_t size (void) { return " + localOffset[i] + "; }\n"
        code += "};\n";
        code += "\n";
    }

    code += "class " + sufix + "Pols\n";
    code += "{\n";
    code += "public:\n";
    
    for (var i=0; i<namespaces.length; i++) {
        code += "    " + namespaces[i] + sufix + "Pols " + namespaces[i] + ";\n"
    }
    code += "\n";
    code += "    " + sufix + "Pols (void * pAddress) : ";
    for (var i=0; i<namespaces.length; i++) {
        code += namespaces[i] + "(pAddress)";
        if (i<(namespaces.length-1)) {
            code += ", ";
        } else {
            code += " ";
        }
    }
    code += "{}\n";
    code += "\n";
    code += "    static uint64_t size (void) { return " + offset + "; }\n"
    code += "};\n"
    code += "\n";
    code += "#endif" + " // " + fileDefine + "\n";
    return code;
}