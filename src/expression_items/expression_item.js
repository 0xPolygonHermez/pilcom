/*                      cexp  next  ind  Parent          Item            DefClas         Definition
                        ----  ----  ---  --------------  --------------  --------------  ---------------------------------------------
    Challenge             -     -    *   ProofItem  id              ProofStageDef   id + stage [used]
    SubExpression         -     *    *   ProofItem       id              -               id [const,use]
    FeValue               -     -    -   ValueItem       value           -               value (fe) [const]
    IntValue              *     -    -   ValueItem       value           -               value (bigint) [const]
    FixedCol              -     -    *   ProofItem       id              -               id [used]
    FunctionCall          *     *    ?   RuntimeItem     "id",argValues  Function        name,args,return,statements
    Proofval              -     -    *   ProofItem       id              -               id [used]
    Public                -     -    *   ProofItem       id              -               id [used]
    Publictable           -     -    *   ProofItem       id              PublictableDef  id + numCols,maxRows,aggType,rowExpressionId [used]
    *PublictableCol       -     -    *   ProofItem       id,colId        -               [const, used]
    ReferenceItem         *     *    *   RuntimeItem     name            ?               name + type, instance, etc.
    StackItem             -     -    -   ExpressionItem  offset          -               -
    StringValue           *     -    -   RuntimeItem     value           -               value (string) [const, used]
    Subproofval           -     -    *   ProofItem       id              SubproofvalDef  id + subproofId [used]
    WitnessCol            -     *    *   ProofItem  id              ProofStageDef   id + stage [used]


                         Type         List                     Item
                         ----------   --------------           --------------
    Challenge            challenge    challenges (Ids)         id               Ids: new cls(id)
    Expression           expr         exprs (Variables)        value            Variables: new cls(value)
    SubExpression        subexpr      subexprs (Ids)           id               Ids: new cls(id)
    FeValue              fe           fes (Variables)          value            Variables: new cls(value)
    IntValue             int          ints (Variables)         value            Variables: new cls(value)
    *IntValue            constant     constants (Indexable)    value            Variables: new cls(value)
    FixedCol             fixed        fixeds (FixedCols)       id               Ids: new cls(id)
    FunctionCall         function     functions (Indexable)    "id",argValues
    Proofval             proofvalue   proofvalues (Ids)        id               Ids: new cls(id)
    Public               public       publics (Ids)            id               Ids: new cls(id)
    Publictable          publictable                           id
    *PublictableCol                                            id,colId
    ReferenceItem        -            references (References)  name
    StackItem            -                                     offset
    StringValue          string       strings (Variables)      value            Variables: new cls(value)
    Subproofval          subproofval  subproofvalues (Ids)     id               Ids: new cls(id)
    WitnessCol           witness      witness (WitnessCols)    id               WitnessCols: new WitnessCol(id, stage)



    cexp: compiler expression (build)
    next: allowed next
    ind:  allowed indexes

    ExpressionItem > ProofItem
                   > RuntimeItem
                   > ValueItem

    Array information on reference

    ArrayOf (multiarray, from: ExpressionItem)
    ArrayOf (multiarray, [ExpressionItem]) = List

*/
const Exceptions = require('../exceptions.js');
class ExpressionItem {
    static _classToManager = {};

    constructor(debug = {}) {
        this.debug = debug;
        this.indexes = false;
        this._ns_ = 'ExpressionItem';
    }
    static registerClass(name, cls) {
        ExpressionItem[name] = cls;
    }
    get dim () {
        return Array.isArray(this.indexes) ? this.indexes.length : 0;
    }
    popArrayIndex () {
        if (this.indexes === false) {
            throw new Error(`try to add index to non-indexable element`);
        }
        if (typeof this.indexes === 'undefined') {
            this.indexes = [];
        }
        this.indexes.push(ExpressionItem.IntValue(index));
    }
    pushArrayIndex () {
        if (this.indexes === false) {
            throw new Error(`try to add an index to non-indexable element`);
        }
        if (this.dim < 1) {
            throw new Error(`try to remove an index from element without indexes`);
        }
        return this.indexes.pop();
    }
    toString(options) {
        return `${this.constructor.name}()`;
    }
    dump(options) {
        return this.toString(options);
    }
    get type() {
        console.log(this);
        throw new Error(`FATAL: use type obsolete-property`)
    }
    getNext() {
        return this.next ?? 0;
    }
    getNextStrings(options) {
        const next = this.getNext(options);
        const pre = next < 0 ? (next < -1 ? `${-next}'`:"'"):'';
        const post = next > 0 ? (next > 1 ? `'${next}`:"'"):'';
        return [pre,post];
    }
    static setManager(cls, manager) {
        console.log(['SET_MANAGER', cls.name]);
        ExpressionItem._classToManager[cls.name] = manager;
    }
    getManager() {
        console.log(['GET_MANAGER', this.constructor.name]);
        return ExpressionItem._classToManager[this.constructor.name];
    }
    _asDefault(method, defaultValue = false) {
        try {
            return method.apply(this, [defaultValue]);
        } catch (e) {
            if (e instanceof Exceptions.CannotBeCastToType) {
                return defaultValue;
            }
            throw e;
        }
    }
    eval(options = {}) {
        throw new Error(`eval not defined for class ${this.constructor.name}`);
    }
}

module.exports = ExpressionItem;