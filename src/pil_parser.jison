/* description: Construct AST for pil language. */

/* lexical grammar */
%lex

%%

\s+                                         { /* skip whitespace */ }
\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/ { /* console.log("MULTILINE COMMENT: "+yytext); */  }
\/\/.*                                      { /* console.log("SINGLE LINE COMMENT: "+yytext); */ }

pol                                         { return 'pol'; }
commit                                      { return 'commit'; }
constant                                    { return 'constant'; }
namespace                                   { return 'namespace'; }
include                                     { return 'INCLUDE'; }
in                                          { return 'in'; }
is                                          { return 'is'; }
connect                                     { return 'connect'; }
public                                      { return 'public'; }

var                                         { return 'var' }
expr                                        { return 'expr' }
refpol                                      { return 'refpol' }
refvar                                      { return 'refvar' }
refexpr                                     { return 'refexpr' }

challenge                                   { return 'challenge' }

for                                         { return 'for' }
while                                       { return 'while' }
do                                          { return 'do' }
break                                       { return 'break' }
continue                                    { return 'continue' }
if                                          { return 'if' }
elseif                                      { return 'elseif' }
else                                        { return 'else' }
switch                                      { return 'switch' }
case                                        { return 'case' }

when                                        { return 'when' }
subproof                                    { return 'subproof' }
aggregable                                  { return 'aggregable' }
stage                                       { return 'stage' }

function                                    { return 'function' }
return                                      { return 'return' }

\.\.\.                                      { return '...' }
\.\.                                        { return '..' }

(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*) { yytext = yytext.replace(/\_/g, ""); return 'NUMBER'; }

\"[^"]+\"                                   { yytext = yytext.slice(1,-1); return 'STRING'; }
[a-zA-Z_][a-zA-Z$_0-9]*                     { return 'IDENTIFIER'; }
\%[a-zA-Z_][a-zA-Z$_0-9]*                   { yytext = yytext.slice(1); return 'CONSTANTID'; }
\*\*                                        { return '**'; }
\+                                          { return '+'; }
\-                                          { return '-'; }
\*                                          { return '*'; }
\'                                          { return "'"; }
\;                                          { return 'CS'; }
\,                                          { return ','; }
\.                                          { return '.'; }
\&\&                                        { return 'AND'; }
\|\|                                        { return 'OR'; }
\<                                          { return 'LT'; }
\>                                          { return 'GT'; }
\<\=                                        { return 'LE'; }
\>\=                                        { return 'GE'; }
\=\=\=                                      { return '==='; }
\!\=                                        { return 'NE'; }
\=\=                                        { return 'EQ'; }
\=                                          { return '='; }
\(                                          { return '('; }
\)                                          { return ')'; }
\[                                          { return '['; }
\]                                          { return ']'; }
\{                                          { return '{'; }
\}                                          { return '}'; }
\:                                          { return ':'; }
\!                                          { return '!'; }
<<EOF>>                                     { return 'EOF'; }
.                                           { console.log("INVALID: " + yytext); return 'INVALID'}

/lex

%left CS
%nonassoc EMPTY
%nonassoc NUMBER CONSTANTID
%nonassoc else
%nonassoc elseif
%left "'"
%left ','
%left '+' '-'
%left OR
%left AND
%left '*'
%left '**'
%left '[' ']'
%left '.'
%right UMINUS UPLUS ':' '!'
%nonassoc '('

%{
const util = require('util');
function setLines(dst, first, last) {
    last = last || first;
    dst.first_line = first.first_line;
    dst.first_column = first.first_column;
    dst.last_line = last.last_line;
    dst.last_column = last.last_column;
}
%}

%start allStatments

%% /* language grammar */


allStatments
    : statmentList EOF
        {
            // console.log(JSON.stringify($1, null, 1));
            $$ = $1;
            return $$
        }
    | statmentList CS EOF
        {
            // console.log(JSON.stringify($1, null, 1));
            $$ = $1;
            return $$
        }
    ;

blockStatmentList
    : blockStatmentList CS %prec EMPTY
        {
            $$ = $1;
        }
    | statmentList %prec EMPTY
        {
            $$ = $1;
        }
    | %prec EMPTY
    ;

statmentList
    : statmentList CS statment
        {
            $1.push($3);
        }
    | statment
        {
            $$ = [$1];
        }
    ;

statment
    : plookupIdentity
        {
            $$ = $1;
        }
    | permutationIdentity
        {
            $$ = $1;
        }
    | connectIdentity
        {
            $$ = $1;
        }
    | polCommitDeclaration
        {
            $$ = $1;
        }
    | polConstantDeclaration
        {
            $$ = $1;
        }
    | namespaceDef
        {
            $$ = $1;
        }
    | subproofDef
        {
            $$ = $1;
        }
    | polDef
        {
            $$ = $1;
        }
    | polIdentity
        {
            $$ = $1;
        }
    | include
        {
            $$ = $1
        }
    | publicDeclaration
        {
            $$ = $1
        }
    | constantDef
        {
            $$ = $1
        }
    | codeBlock
        {
            $$ = { type: "Code", statments: $1 };
        }
    | when expression "{" whenBody "}"
        {
            $$ = { type: "When", statments: $1 };
        }
    ;

whenBody
    : whenBody CS polIdentity
        {
            $$ = $1;
            $$.push($3);
        }
    | whenBody CS
        {
            $$ = $1;
        }
    | polIdentity
        {
            $$ = [$1];
        }
    ;

codeBlock
    : codeVarDeclaration
        {
           setLines($$, @1, @1);
        }
    | for '(' codeForInit CS condExpression CS expressionList ')' '{' blockStatmentList '}'
        {
           setLines($$, @1, @11);
        }
    | while '(' condExpression ')' '{' blockStatmentList '}'
        {

           setLines($$, @1, @7);
        }
    | do '{' blockStatmentList '}' while '(' condExpression ')'
        {

           setLines($$, @1, @8);
        }
    | switch '(' expression ')' '{' codeCaseList '}'
        {

           setLines($$, @1, @7);
        }
    | if '(' condExpression ')' '{' blockStatmentList '}' codeElseIf
        {
            console.log('#### IF1 ####');
            $$ = {conditions: [{type: 'if', expression: $3, statment: $6 }].concat($8.conditions) };
            setLines($$, @1, @8);
        }
    | if '(' condExpression ')' '{' blockStatmentList '}' codeElseIf else '{' blockStatmentList '}'
        {
           console.log('#### IF2 ####');
           $$ = { conditions: [{type: 'if', expression: $3, statment: $6 }].concat($8.conditions) };
           $$.conditions.push({type: 'else', statment: $11 });
           setLines($$, @1, @9);
        }
    | continue
        {
           setLines($$, @1, @1);
        }
    | break
        {
           setLines($$, @1, @1);
        }
    ;

codeElseIf
    : codeElseIf elseif '(' condExpression ')' '{' statmentList '}'
        {
            console.log('#### IF3 ####');
            console.log($1);
            $1.conditions.push({type:'elseif', expression: $4, statments: $7});
            $$ = $1;
            setLines($$, @1, @8);
        }
    |
        {
            console.log('#### IF4 ####');
            $$ = { conditions: [] };
            setLines($$, @0, @0);
       }
    ;

codeCaseList
    : codeCaseList codeCaseItem
    | codeCaseItem
    ;

codeCaseItem
    : case expression ':' statmentList
    | else statmentList
    ;

codeForInit
    : codeVarDeclaration
    | codeVarAssigment
    ;

codeVarDeclaration
    : var codeVarInit
    | expr codeVarInit
    | refpol codeVarInit
    | refexpr codeVarInit
    | refvar codeVarInit
    ;

codeVarInit
    : IDENTIFIER
    | IDENTIFIER '=' expression
    ;

codeVarAssignment
    : IDENTIFIER '=' expression
    ;

include
    : INCLUDE STRING
        {
            $$ = {type: "Include", file: $2}
        }
    ;

polDef
    : pol IDENTIFIER '=' expression
        {
            $$ = {type: "PolDefinition", name: $2, expression: $4};
            setLines($$, @1, @3);
        }
    ;

polIdentity
    : expression '===' expression
        {
            $$ = {type: "PolIdentity", expression: { op: "sub", values: [$1,$3] }};
            setLines($$, @1, @3);
        }
    ;

plookupIdentity
    : puSide in puSide
        {
            $$ = {type: "PlookupIdentity", f: $1.pols, t: $3.pols, selF: $1.sel, selT: $3.sel};
            setLines($$, @1, @3);
        }
    ;

permutationIdentity
    : puSide is puSide
        {
            $$ = {type: "PermutationIdentity", f: $1.pols, t: $3.pols, selF: $1.sel, selT: $3.sel};
            setLines($$, @1, @3);
        }
    ;

connectIdentity
    : '{' expressionList '}' connect '{' expressionList '}'
        {
            $$ = {type: "ConnectionIdentity", pols: $2, connections: $6}
            setLines($$, @1, @7);
        }
    ;

puSide
    : expression '{' expressionList '}'
        {
            $$ = {pols:$3, sel:  $1};
        }
    | '{' expressionList '}'
        {
            $$ = {pols:$2, sel:  null};
        }
    | expression
        {
            $$ = {pols:[$1], sel:  null};
        }
    ;

expressionList
    : expressionList ',' expression
        {
            $1.push($3);
        }
    | expression
        {
            $$ = [$1];
        }
    ;

polCommitDeclaration
    : pol commit polNamesList
        {
            $$ = {type: "PolCommitDeclaration", names: $3}
            setLines($$, @1, @3);
        }
    ;

publicDeclaration
    : public IDENTIFIER '=' polId '(' expression ')'
        {
            $$ = {type: "PublicDeclaration", name: $2, pol: $4, idx: $6}
            setLines($$, @1, @4);
        }
    ;


polConstantDeclaration
    : pol constant polNamesList
        {
            $$ = {type: "PolConstantDeclaration", names: $3}
            setLines($$, @1, @3);
        }
    ;


polNamesList
    : polNamesList ',' polName
        {
            $1.push($3);
            $$ = $1;
        }
    | polName
        {
            $$ = [$1];
        }
    ;

polName
    : IDENTIFIER
        {
            $$ = {
                name: $1,
                type: "single"
            }
        }
    | IDENTIFIER '[' expression ']'
        {
            $$ = {
                name: $1,
                type: "array",
                expLen: $3
            }
        }
    ;

namespaceDef
    : namespace IDENTIFIER subproof IDENTIFIER
        {
            $$ = {type: "Namespace", name: $2, subproof: $4}
            setLines($$, @1, @4);
        }
    | namespace IDENTIFIER '(' expression ')'
        {
            $$ = {type: "Namespace", name: $2, subproof: false, exp: $4}
            setLines($$, @1, @5);
        }
    ;
subproofDef
    : subproof IDENTIFIER '(' expressionList ')'
        {
            $$ = {type: "Subproof", name: $2, exp: $4}
            setLines($$, @1, @5);
        }
    ;

constantDef
    : constant CONSTANTID '=' expression
        {
            $$ = {type: "ConstantDefinition", name: $2, exp: $4}
            setLines($$, @1, @4);
        }
    ;

expression
    : e5 %prec EMPTY
        {
            $$ = $1;
        }
    ;

condExpression
    : expression EQ expression
        {
            $$ = { op: "eq", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression NE expression
        {
            $$ = { op: "ne", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression LT expression
        {
            $$ = { op: "lt", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression GT expression
        {
            $$ = { op: "gt", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression LE expression
        {
            $$ = { op: "le", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression GE expression
        {
            $$ = { op: "ge", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    ;

condExpression
    : condExpression AND condExpression
        {
            $$ = { op: "and", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | condExpression OR condExpression
        {
            $$ = { op: "or", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | '!' condExpression
        {
            $$ = { op: "not", values: [$2] };
            setLines($$, @1, @2);
        }
    | '(' condExpression ')'
        {
            $$ = $2;
        }
    ;

e5
    : e5 '+' e4
        {
            // $$ = yy.parser.calculate.add($1,$3);
            $$ = { op: "add", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | e5 '-' e4
        {
            $$ = { op: "sub", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | e4 %prec EMPTY
        {
            $$ = $1;
        }
    ;


e4
    : e4 '*' e3
        {
            $$ = { op: "mul", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | e3 %prec EMPTY
        {
            $$ = $1;
        }
    ;

e3
    : e3 '**' e2
        {
            $$ = { op: "pow", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | e2 %prec EMPTY
        {
            $$ = $1;
        }
    ;

e2
    : '+' e2 %prec UPLUS
        {
            $$ = $2;
            setLines($$, @1, @2);
        }
    | '-' e2 %prec UMINUS
        {
            $$ = { op: "neg", values: [$2] };
            setLines($$, @1, @2);
        }
    | e1 %prec EMPTY
        {
            $$ = $1;
        }
    | ':' IDENTIFIER
        {
            $$ = {op: "public", name: $2 }
            setLines($$, @1, @2);
        }
    | polId
        {
            $$ = $1
            setLines($$, @1);
        }
    ;


e1
    : NUMBER %prec EMPTY
        {
            $$ = {op: "number", value: $1 }
            setLines($$, @1);
        }
    | CONSTANTID %prec EMPTY
        {
            $$ = {op: "constant", name: $1 }
            setLines($$, @1);
        }
    | '(' expression ')'
        {
            $$ = $2;
            setLines($$, @1, @3);
        }
    ;

polId
    : polId "'" %prec LOWER_PREC
        {
            $1.next= true;
            $$ = $1;
        }
    | polId "'" e1
        {
            $1.next= $3;
            $$ = $1;
        }
    | IDENTIFIER '.' IDENTIFIER '[' expression ']'
        {
            $$ = {op: "pol", next: false, namespace: $1, name: $3, idxExp: $5}
            setLines($$, @1, @6);
        }
    | IDENTIFIER '.' IDENTIFIER
        {
            $$ = {op: "pol", next: false, namespace: $1, name: $3}
            setLines($$, @1, @3);
        }
    | IDENTIFIER '[' expression ']'
        {
            $$ = {op: "pol", next: false, namespace: "this", name: $1, idxExp: $3}
            setLines($$, @1, @4);
        }
    | IDENTIFIER
        {
            $$ = {op: "pol", next: false, namespace: "this", name: $1}
            setLines($$, @1, @1);
        }
    ;