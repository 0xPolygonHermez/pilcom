const { F1Field } = require("ffjavascript");

module.exports.compile = require("./src/compiler.js");
// module.exports.createCommitedPols = require("./src/createpols.js").createCommitedPols;
// module.exports.createConstantPols = require("./src/createpols.js").createConstantPols;

module.exports.verifyPil = require("./src/pil_verifier.js")
// module.exports.exportPolynomials = require("./src/binfiles.js").exportPolynomials;
// module.exports.importPolynomials = require("./src/binfiles.js").importPolynomials;
//module.exports.importPolynomialsToBuffer = require("./src/binfiles.js").importPolynomialsToBuffer;
module.exports.getKs = require("./src/utils.js").getKs;
module.exports.getRoots = require("./src/utils.js").getRoots;
module.exports.newConstantPolsArray = require("./src/polsarray.js").newConstantPolsArray;
module.exports.newCommitPolsArray = require("./src/polsarray.js").newCommitPolsArray;
module.exports.BigBuffer = require("./src/bigbuffer.js");
module.exports.F = new F1Field(0xFFFFFFFF00000001n);


