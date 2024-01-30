module.exports = class ExpressionOperationsInfo {
    static #operations = {
        mul:  { type: 'arith',   label: '*',  precedence:  96, args: 2, commutative: true },
        add:  { type: 'arith',   label: '+',  precedence:  10, args: 2, commutative: true },
        sub:  { type: 'arith',   label: '-',  precedence:  11, args: 2, commutative: false },
        pow:  { type: 'arith',   label: '**', precedence:  98, args: 2, commutative: false },
        neg:  { type: 'arith',   label: '-',  precedence: 102, args: 1, commutative: false },
        div:  { type: 'arith',   label: '/',  precedence:  94, args: 2, commutative: false },
        mod:  { type: 'arith',   label: '%',  precedence:  92, args: 2, commutative: false },
        gt:   { type: 'cmp',     label: '>',  precedence:  76, args: 2, commutative: false },
        ge:   { type: 'cmp',     label: '>=', precedence:  72, args: 2, commutative: false },
        lt:   { type: 'cmp',     label: '<',  precedence:  78, args: 2, commutative: false },
        le:   { type: 'cmp',     label: '<=', precedence:  74, args: 2, commutative: false },
        eq:   { type: 'cmp',     label: '==', precedence:  66, args: 2, commutative: true },
        ne:   { type: 'cmp',     label: '!=', precedence:  64, args: 2, commutative: true },
        and:  { type: 'logical', label: '&&', precedence:  46, args: 2, commutative: true },
        or:   { type: 'logical', label: '||', precedence:  44, args: 2, commutative: true },
        shl:  { type: 'bit',     label: '<<', precedence:  86, args: 2, commutative: false },
        shr:  { type: 'bit',     label: '>>', precedence:  84, args: 2, commutative: false },
        band: { type: 'bit',     label: '&',  precedence:  58, args: 2, commutative: true },
        bor:  { type: 'bit',     label: '|',  precedence:  56, args: 2, commutative: true },
        bxor: { type: 'bit',     label: '^',  precedence:  54, args: 2, commutative: true },
        not:  { type: 'logical', label: '!',  precedence: 100, args: 1, commutative: false }
    };

    static get(operation) {
        return ExpressionOperationsInfo.#operations[operation] ?? false;
    }
};
