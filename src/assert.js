const _assert = require("chai").assert;

function assertLog(condition, info) {
    if (!condition) {
        console.log(info);
    }
    _assert(condition);
}

function assertReturnInstanceOf(value, cls, info) {
    assertLog(value instanceof cls, [value, info]);
    return value;
}
module.exports = {
    assert: _assert,
    assertLog,
    assertReturnInstanceOf
}