module.exports.compile = require("./src/compiler.js");
module.exports.createCommitedPols = require("./src/createpols.js").createCommitedPols;
module.exports.createConstantPols = require("./src/createpols.js").createConstantPols;

module.exports.verifyPil = require("./src/pil_verifier.js")
module.exports.exportPolynomials = require("./src/binfiles.js").exportPolynomials;
module.exports.importPolynomials = require("./src/binfiles.js").importPolynomials;
