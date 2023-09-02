/*                      cexp  next  ind  Parent          Item            DefClas         Definition
                        ----  ----  ---  --------------  --------------  --------------  ---------------------------------------------
    Challenge             -     -    *   ProofStageItem  id              ProofStageDef   id + stage [used]
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
    StringValue           *     -    -   RuntimeItem     value           -               value (string) [const, used]
    Subproofval           -     -    *   ProofItem       id              SubproofvalDef  id + subproofId [used]
    WitnessCol            -     *    *   ProofStageItem  id              ProofStageDef   id + stage [used]


                         Type         List                     Item
                         ----------   --------------           --------------
    Challenge            challenge    challenges (Ids)         stage            Ids: new cls(id)
    Expression           expr         exprs (Variables)        value            Variables: new cls(value)
    SubExpression        subexpr      subexprs (Ids)           id               Ids: new cls(id)
    FeValue              fe           fes (Variables)          value            Variables: new cls(value)
    IntValue             int          ints (Variables)         value            Variables: new cls(value)
    FixedCol             fixed        fixeds (FixedCols)       id               Ids: new cls(id)
    Proofval             proofvalue   proofvalues (Ids)        id               Ids: new cls(id)
    Public               public       publics (Ids)            id               Ids: new cls(id)
    Publictable          publictable                           id
    *PublictableCol                                            id,colId
    ReferenceItem        -            references (References)  name
    StringValue          string       strings (Variables)      value            Variables: new cls(value)
    Subproofval          subproofval  subproofvalues (Ids)     id               Ids: new cls(id)
    WitnessCol           witness      witness (WitnessCols)    id               WitnessCols: new WitnessCol(id, stage)



    cexp: compiler expression (build)
    next: allowed next
    ind:  allowed indexes

    ExpressionItem > ProofItem > ProofStageItem
                   > RuntimeItem
                   > ValueItem

    Array information on reference

    ArrayOf (multiarray, from: ExpressionItem)
    ArrayOf (multiarray, [ExpressionItem]) = List

*/
module.exports = class DefinitionItem {
    constructor (id, properties = {}) {
        this.id = id;
        this.label = properties.label;
    }
    dump(options) {
        return `${this.constructor.name}()`;
    }
    get type() {
        console.log(this);
        throw new Error(`FATAL: use type obsolete-property`)
    }
    cloneProperties(cloned) {
        cloned.id = this.id;
        cloned.label = this.label;
    }
}
