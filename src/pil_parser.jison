/* description: Construct AST for pil language. */

/* lexical grammar */
%lex

%%

\s+                                         { /* skip whitespace */ }
\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/ { /* console.log("MULTILINE COMMENT: "+yytext); */  }
\/\/.*                                      { /* console.log("SINGLE LINE COMMENT: "+yytext); */ }
(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*) { yytext = yytext.replace(/\_/g, ""); return 'NUMBER'; }
pol(?=[^a-zA-Z$_0-9])                       { return 'pol'; }
commit(?=[^a-zA-Z$_0-9])                    { return 'commit'; }
constant(?=[^a-zA-Z$_0-9])                  { return 'constant'; }
namespace(?=[^a-zA-Z$_0-9])                 { return 'namespace'; }
include(?=[^a-zA-Z$_0-9])                   { return 'INCLUDE'; }
in(?=[^a-zA-Z$_0-9])                        { return 'in'; }
is(?=[^a-zA-Z$_0-9])                        { return 'is'; }
connect(?=[^a-zA-Z$_0-9])                 { return 'connect'; }
bool(?=[^a-zA-Z$_0-9])                      { return 'bool'; }
u8(?=[^a-zA-Z$_0-9])                        { return 'u8'; }
u16(?=[^a-zA-Z$_0-9])                       { return 'u16'; }
u32(?=[^a-zA-Z$_0-9])                       { return 'u32'; }
u64(?=[^a-zA-Z$_0-9])                       { return 'u64'; }
s8(?=[^a-zA-Z$_0-9])                        { return 's8'; }
s16(?=[^a-zA-Z$_0-9])                       { return 's16'; }
s32(?=[^a-zA-Z$_0-9])                       { return 's32'; }
s64(?=[^a-zA-Z$_0-9])                       { return 's64'; }
field(?=[^a-zA-Z$_0-9])                     { return 'field'; }
public(?=[^a-zA-Z$_0-9])                    { return 'public'; }

\"[^"]+\"                                   { yytext = yytext.slice(1,-1); return 'STRING'; }
[a-zA-Z_][a-zA-Z$_0-9]*                     { return 'IDENTIFIER'; }
\%[a-zA-Z_][a-zA-Z$_0-9]*                   { yytext = yytext.slice(1); return 'CONSTANTID'; }
\*\*                                        { return '**'; }
\+                                          { return '+'; }
\-                                          { return '-'; }
\*                                          { return '*'; }
\'                                          { return "'"; }
\;                                          { return ';'; }
\,                                          { return ','; }
\.                                          { return '.'; }
\=                                          { return '='; }
\(                                          { return '('; }
\)                                          { return ')'; }
\[                                          { return '['; }
\]                                          { return ']'; }
\{                                          { return '{'; }
\}                                          { return '}'; }
\:                                          { return ':'; }
<<EOF>>                                     { return 'EOF'; }
.                                           { console.log("INVALID: " + yytext); return 'INVALID'}

/lex

%left ';'
%left EMPTY
%left ','
%left '+' '-'
%left '*'
%left '**'
%left '[' ']'
%left '.'
%right UMINUS UPLUS


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
            console.log(JSON.stringify($1, null, 1));
            $$ = $1;
            return $$
        }
    | statmentList ';' EOF
        {
            console.log(JSON.stringify($1, null, 1));
            $$ = $1;
            return $$
        }
    ;

statmentList
    : statmentList ';' statment
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
    ;

include
    : INCLUDE STRING
        {
            $$ = {type: "INCLUDE", file: $2}
        }
    ;

polDef
    : 'pol' IDENTIFIER '=' expression
        {
            $$ = {type: "POLDEFINITION", name: $2, expression: $4};
            setLines($$, @1, @3);
        }
    ;

polIdentity
    : expression '=' expression
        {
            $$ = {type: "POLIDENTITY", expression: { op: "sub", values: [$1,$3] }};
            setLines($$, @1, @3);
        }
    ;

plookupIdentity
    : puSide 'in' puSide
        {
            $$ = {type: "PLOOKUPIDENTITY", f: $1.pols, t: $3.pols, selF: $1.sel, selT: $3.sel};
            setLines($$, @1, @3);
        }
    ;

permutationIdentity
    : puSide 'is' puSide
        {
            $$ = {type: "PERMUTATIONIDENTITY", f: $1.pols, t: $3.pols, selF: $1.sel, selT: $3.sel};
            setLines($$, @1, @3);
        }
    ;

connectIdentity
    : '{' expressionList '}' 'connect' '{' expressionList '}'
        {
            $$ = {type: "CONNECTIONIDENTITY", pols: $2, connections: $6}
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
    : 'pol' elementType 'commit' polNamesList
        {
            $$ = {type: "POLCOMMTDECLARATION", names: $4, elementType: $2}
            setLines($$, @1, @4);
        }
    | 'pol' 'commit' polNamesList
        {
            $$ = {type: "POLCOMMTDECLARATION", names: $3, elementType: "field"}
            setLines($$, @1, @3);
        }
    ;

publicDeclaration
    : 'public' IDENTIFIER '=' polId '(' NUMBER ')'
        {
            $$ = {type: "PUBLICDECLARATION", name: $2, pol: $4, idx: $6}
            setLines($$, @1, @4);
        }
    ;


polConstantDeclaration
    : 'pol' elementType 'constant' polNamesList
        {
            $$ = {type: "POLCONSTANTDECLARATION", names: $4, elementType: $2}
            setLines($$, @1, @3);
        }
    | 'pol' 'constant' polNamesList
        {
            $$ = {type: "POLCONSTANTDECLARATION", names: $3, elementType: "field"}
            setLines($$, @1, @3);
        }
    ;

elementType
    : bool
    | u8
    | u16
    | u32
    | u64
    | s8
    | s16
    | s32
    | s64
    | field
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
    : 'namespace' IDENTIFIER '(' expression ')'
        {
            $$ = {type: "NAMESPACE", namespace: $2, exp: $4}
            setLines($$, @1, @5);
        }
    ;

constantDef
    : 'constant' CONSTANTID '=' expression
        {
            $$ = {type: "CONSTANTDEF", name: $2, exp: $4}
            setLines($$, @1, @4);
        }
    ;

expression
    : e5 %prec EMPTY
        {
            $$ = $1;
        }
    ;


e5
    : e5 '+' e4
        {
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
    ;


e1
    : polId
        {
            $$ = $1
            setLines($$, @1);
        }
    | NUMBER
        {
            $$ = {op: "number", value: $1 }
            setLines($$, @1);
        }
    | CONSTANTID
        {
            $$ = {op: "constant", name: $1 }
            setLines($$, @1);
        }
    | ':' IDENTIFIER
        {
            $$ = {op: "public", name: $2 }
            setLines($$, @1, @2);
        }
    | '(' expression ')'
        {
            $$ = $2;
            setLines($$, @1, @3);
        }
    ;

polId
    : polId "'"
        {
            $1.next= true;
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