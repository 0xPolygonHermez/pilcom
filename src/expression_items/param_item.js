const RuntimeItem = require("./runtime_item.js");

// NEXT FEATURE
// ParamItem is as a macro or expression template.  by $<number>, allows to define expression,
// instance it without replacing this parameter. To expand param in an expression
// expr example = (10 + $1 + 2 * $2) * $1
// expr replaced = example(13, x + 2);
// replaced was (10 + 13 + 2 * (x + 2)) * 13

module.exports = class ParamItem extends RuntimeItem {
    // TODO: next
    constructor (id) {
        super();
        this.id;
    }
    dump(options) {
        return '$'+this.id;
    }
    cloneInstance() {
        return new ParamItem(this.id);
    }
}
