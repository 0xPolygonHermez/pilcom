/*                      next  indexes  Parent          Item            Definition
                        ----  -------  --------------  --------------  ---------------------------------------------
    Challenge             -      *     ProofStageItem  id              id + stage [used]
    ExpressionReference   *      *     RuntimeItem     id              id [const,use]
    FeValue               -      -     ValueItem       value           value (fe) [const]
    IntValue              -      -     ValueItem       value           value (bigint) [const]
    FixedCol              -      *     ProofItem       id              id [used]
    FunctionCall          *      ?     RuntimeItem     "id",argValues  FunctionDefinition: name,args,return,statements
    Proofval              -      *     ProofItem       id              id [used]
    Public                -      *     ProofItem       id              id [used]
    Publictable           -      *     ProofItem       id              id + numCols,maxRows,aggType,rowExpressionId [used]
    *PublictableCol       -      *     ProofItem       id,colId        [const, used]
    Reference             *      *     RuntimeItem     name            name + type, instance, etc.
    StackItem             -      -     ExpressionItem  offset          -
    StringValue           -      -     RuntimeItem     value           value (string) [const, used]
    Subproofval           -      *     ProofItem       id              id + subproofId [used]
    WitnessCol            *      *     ProofStageItem  id              id + stage [used]

    ExpressionItem > ProofItem > ProofStageItem
                   > RuntimeItem
                   > ValueItem
*/
module.exports = class ExpressionItem {
    static _classToManager = {};

    dump(options) {
        return `${this.constructor.name}()`;
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
}
