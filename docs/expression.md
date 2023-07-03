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
|col (im)||
|challenge||
|public||
|air value||
|subair value||
|number||
|list||

expression_list = expression

## Operations over expressions
- **instance()** make a copy of expression, where __runtime values and expressions__ (variables, eq, be) are replaced
- **evaluate()** calculate a single value (int, fe, bool) without replacing runtime values and expressions. For example, a condition on loop, etc.
- **next(int)** instance an expression with next rows (positive or negative)
- **toType(typename)** convert, cast an expression as concret type.
- **set(typevalue)** set expression
- **index(n)** get n-th element of expression_list
- **isArray** return if has more than element.

## References part
- array dimensions
- [array lengths]
- isReference

## Type Description
- int, int[], int[][], ....
- fe, fe[], fe[][], .....


