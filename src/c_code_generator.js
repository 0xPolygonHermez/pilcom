
function filter_name(name)
{
    if (name == "assert") return "assert_pol";
    if (name == "return") return "return_pol";
    return name;
}

module.exports.generateCCode = async function generate(pols, type, namespaceName = false)
{

    let code = "";

    // List all cmP pols namespaces
    let namespaces = [];
    let numberOfPols = [];
    for (var key in pols.references) {
        var pol = pols.references[key];
        if (pol.type == type) {
            const stringArray = key.split(".");
            const namespace = stringArray[0];
            for (var i=0; i<namespaces.length; i++) {
                if (namespaces[i] == namespace) break;
            }
            if (i==namespaces.length) {
                namespaces[i] = namespace;
                numberOfPols[i] = 0;
            }
        }
    }


    let declaration = [];
    let initialization = [];
    let degree = [];
    let maxDegree = 0;
    let offset = 0;
    let offset_transpositioned = 0;
    let localOffset = [];

    // Init the declaration and initialization arrays
    for (var i=0; i<namespaces.length; i++) {
        declaration[i] = "";
        initialization[i] = "";
        localOffset[i] = 0;
    }

    // Calculate the number of polynomials of the requested type and the sufix
    var numPols = 0;
    var sufix = "";
    var fileDefine = "";
    const defineSuffix = (namespaceName === false ? "" : ("_"+namespaceName)).toUpperCase();
    if (type == "cmP") {
        numPols = pols.nCommitments;
        sufix = "Commit";
        fileDefine = "COMMIT_POLS_HPP" + defineSuffix;
    } else if (type == "constP") {
        numPols = pols.nConstants;
        sufix = "Constant";
        fileDefine = "CONSTANT_POLS_HPP" + defineSuffix;
    }

    code += "#ifndef " + fileDefine + "\n";
    code += "#define " + fileDefine + "\n";
    code += "\n";
    code += "#include <cstdint>\n";
    code += "#include \"goldilocks_base_field.hpp\"\n";
    code += "\n";

    if (namespaceName !== false) {
        code += "namespace " + namespaceName + "\n";
        code += "{\n\n";
    }

    code += "class " + sufix + "Pol\n";
    code += "{\n";
    code += "private:\n";
    code += "    Goldilocks::Element * _pAddress;\n";
    code += "    uint64_t _degree;\n";
    code += "    uint64_t _index;\n";
    code += "public:\n";
    code += "    " + sufix + "Pol(Goldilocks::Element * pAddress, uint64_t degree, uint64_t index) : _pAddress(pAddress), _degree(degree), _index(index) {};\n";

    code += "    inline Goldilocks::Element & operator[](uint64_t i) { return _pAddress[i*" + numPols + "]; };\n";
    code += "    inline Goldilocks::Element * operator=(Goldilocks::Element * pAddress) { _pAddress = pAddress; return _pAddress; };\n\n";
    code += "    inline Goldilocks::Element * address (void) { return _pAddress; }\n";
    code += "    inline uint64_t degree (void) { return _degree; }\n";
    code += "    inline uint64_t index (void) { return _index; }\n";

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
                    //console.log("elementType="+pol.elementType);
                    ctype="Goldilocks::Element"; csize=8;
                }

                let array = "";
                if (pol.isArray) {
                    array="["+pol.len+"]";
                }
                //declaration[namespaceId] += "    " + ctype + " * " + name + array + ";\n";
                declaration[namespaceId] += "    " + sufix + "Pol " + filter_name(name) + array + ";\n";
                if (pol.isArray) {
                    initialization[namespaceId] += "        " + filter_name(name) + "{\n";
                    for (var a = 0; a < pol.len; a++) {
                        let comma = ",";
                        if (a == pol.len-1) comma = "";
                        initialization[namespaceId] += "            " + sufix + "Pol((" + ctype + " *)((uint8_t *)pAddress + " + offset_transpositioned + "), degree, " + (i+a) + ")" + comma + "\n";
                        offset += csize*pol.polDeg;
                        offset_transpositioned += csize;
                        localOffset[namespaceId] += csize;
                        numberOfPols[namespaceId] += 1;
                    }
                    initialization[namespaceId] += "        },\n";
                } else {
                    initialization[namespaceId] += "        " + filter_name(name) + "((" + ctype + " *)((uint8_t *)pAddress + " + offset_transpositioned + "), degree, " + i + "),\n"
                    offset += csize*pol.polDeg;
                    offset_transpositioned += csize;
                    localOffset[namespaceId] += csize;
                    numberOfPols[namespaceId] += 1;
                }
                degree[namespaceId] = pol.polDeg;
                maxDegree = Math.max(maxDegree, pol.polDeg);
                break;
            }
        }
    }
    for (var i=0; i<namespaces.length; i++) {
        code += "class " + namespaces[i] + sufix + "Pols\n";
        code += "{\n";
        code += "public:\n";
        code += declaration[i];
        code += "private:\n";
        code += "    void * _pAddress;\n";
        code += "    uint64_t _degree;\n";
        code += "public:\n";
        code += "\n";
        code += "    " + namespaces[i] + sufix + "Pols (void * pAddress, uint64_t degree) :\n";
        code += initialization[i];
        code += "        _pAddress(pAddress),\n";
        code += "        _degree(degree) {};\n";
        code += "\n";
        code += "    inline static uint64_t pilDegree (void) { return " + degree[i] + "; }\n"
        code += "    inline static uint64_t pilSize (void) { return " + localOffset[i] + "; }\n"
        code += "    inline static uint64_t numPols (void) { return " + numberOfPols[i] + "; }\n\n"
        code += "    inline void * address (void) { return _pAddress; }\n";
        code += "    inline uint64_t degree (void) { return _degree; }\n";
        code += "    inline uint64_t size (void) { return _degree*" + numberOfPols[i] + "*sizeof(Goldilocks::Element); }\n";
        code += "};\n";
        code += "\n";
    }

    code += "class " + sufix + "Pols\n";
    code += "{\n";
    code += "public:\n";

    for (var i=0; i<namespaces.length; i++) {
        code += "    " + namespaces[i] + sufix + "Pols " + namespaces[i] + ";\n"
    }

    code += "private:\n";
    code += "    void * _pAddress;\n";
    code += "    uint64_t _degree;\n";

    code += "public:\n";
    code += "\n";
    code += "    " + sufix + "Pols (void * pAddress, uint64_t degree) :\n";
    for (var i=0; i<namespaces.length; i++) {
        code += "        " + namespaces[i] + "(pAddress, degree),\n";
    }
    code += "        _pAddress(pAddress),\n";
    code += "        _degree(degree) {}\n";
    code += "\n";
    code += "    inline static uint64_t pilSize (void) { return " + offset + "; }\n";
    code += "    inline static uint64_t pilDegree (void) { return " + maxDegree + "; }\n";
    code += "    inline static uint64_t numPols (void) { return " + numPols + "; }\n\n";
    code += "    inline void * address (void) { return _pAddress; }\n";
    code += "    inline uint64_t degree (void) { return _degree; }\n";
    code += "    inline uint64_t size (void) { return _degree*" + numPols + "*sizeof(Goldilocks::Element); }\n\n";
    code += "    inline Goldilocks::Element &getElement (uint64_t pol, uint64_t evaluation)\n";
    code += "    {\n";
    code += "        return ((Goldilocks::Element *)_pAddress)[pol + evaluation * numPols()];\n";
    code += "    }\n";
    code += "};\n";
    code += "\n";

    if (namespaceName !== false) {
        code += "} // namespace\n\n"; // namespace name
    }

    code += "#endif" + " // " + fileDefine + "\n";
    return code;
}