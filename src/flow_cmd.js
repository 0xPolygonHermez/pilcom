class FlowAbortCmd {
    static __counter = 0;
    constructor() {this.id = FlowAbortCmd.__counter++}
};
class BreakCmd extends FlowAbortCmd {};
class ContinueCmd extends FlowAbortCmd {};
class ReturnCmd extends FlowAbortCmd {
    constructor(value) { super(); this.value = value; }
}

module.exports = {
    FlowAbortCmd,
    BreakCmd,
    ContinueCmd,
    ReturnCmd
}