const _assert = require("chai").assert;

function assertLog(condition, info) {
    if (!condition) {
        console.log(info);
    }
    _assert(condition);
}

function assertReturnInstanceOf(value, cls, info) {
    console.log([value, info]);
    _assert(value instanceof cls);
    return value;
}
module.exports = {
    assert: _assert,
    assertLog,
    assertReturnInstanceOf
}