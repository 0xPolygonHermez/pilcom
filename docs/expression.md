# PIL2 (variable, columns, references and others)
All was an expression, perhaps a single expression, but expression.
In this way conversion types are more clear, fromExpression, toExpression.

**References** only was name definition of ...

But arrays? at beggining array was a property associated with name,...

And next?

| Type | To expression | From expression |
|------|---------------|-----------------|
|int||
|fe||
|col witness||
|col fixed||
|expression||
|challenge||
|public||
|air value||
|subair value||
|number||
|list||

- **instance()** make a copy of expression, where __runtime values and expressions__ (variables, eq, be) are replaced
- **evaluate()** calculate a single value (int, fe, bool) without replacing runtime values and expressions. For example, a condition on loop, etc..

```mermaid
classDiagram
ExpressionItem <-- RuntimeItem
ExpressionItem <-- ProofItem
RuntimeItem <-- ReferenceItem
RuntimeItem <-- ExpressionReference
RuntimeItem <-- ValueItem
RuntimeItem <-- StringValue
RuntimeItem <-- FunctionCall
ProofItem <-- Challenge
ProofItem <-- ProofVal
ProofItem <-- FixedCol
ProofItem <-- WitnessCol
ProofItem <-- Public
ProofItem <-- SubproofVal
ValueItem <-- IntValue
ValueItem <-- FeValue
``````
