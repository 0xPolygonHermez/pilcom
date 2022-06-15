
module.exports.generateCCode = async function generate(pols, type)
{

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
    code += "#include \"goldilocks/goldilocks_base_field.hpp\"\n";
    code += "\n";

    code += "class " + sufix + "GeneratedPol\n";
    code += "{\n";
    code += "private:\n";
    code += "    Goldilocks::Element * pData;\n";
    code += "public:\n";
    code += "    " + sufix + "GeneratedPol() : pData(NULL) {};\n";
    code += "    Goldilocks::Element & operator[](int i) { return pData[i*" + numPols + "]; };\n";
    code += "    Goldilocks::Element * operator=(Goldilocks::Element * pAddress) { pData = pAddress; return pData; };\n";
    code += "};\n\n";

    // For each cmP pol, add it to the proper namespace array
    for (var i = 0; i < numPols; i++) {
        for (var key in pols.references) {
            var pol = pols.references[key];
            if ( (pol.type == type) && (pol.id==i) ) {
                const nameArray = key.split(".");
                const namespace = nameArray[0];
                const name = nameArray[1];
                let namespaceId = 0;
                for (; namespaceId<namespaces.length; namespaceId++) {
                    if (namespaces[namespaceId]==namespace) {
                        break;
                    }
                }
                let ctype = "";
                let csize = 0;
                if (pol.elementType=="field") { ctype="Goldilocks::Element"; csize=8; }
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
                }

                let array = "";
                if (pol.isArray) {
                    array="["+pol.len+"]";
                }
                //declaration[namespaceId] += "    " + ctype + " * " + name + array + ";\n";
                declaration[namespaceId] += "    " + sufix + "GeneratedPol " + name + array + ";\n";
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