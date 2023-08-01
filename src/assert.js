const _assert = require("chai").assert;

function assertLog(condition, info) {
    if (!condition) {
        console.log(info);
    }
    _assert(condition);
}

module.exports = {
    assert: _assert,
    assertLog
}