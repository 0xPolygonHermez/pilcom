/* description: Construct AST for pil language. */

/* lexical grammar */
%lex

%%

\s+                                         { /* skip whitespace */ }
\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/ { /* console.log("MULTILINE COMMENT: "+yytext); */  }
\/\/.*                                      { /* console.log("SINGLE LINE COMMENT: "+yytext); */ }
(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*) { yytext = yytext.replace(/\_/g, ""); return 'NUMBER'; }
pol(?=[^a-zA-Z$_0-9])                       { return 'pol'; }
commited(?=[^a-zA-Z$_0-9])                  { return 'commited'; }
constant(?=[^a-zA-Z$_0-9])                  { return 'constant'; }
namespace(?=[^a-zA-Z$_0-9])                 { return 'namespace'; }
include(?=[^a-zA-Z$_0-9])                   { return 'INCLUDE'; }
in(?=[^a-zA-Z$_0-9])                        { return 'in'; }
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

\"[^"]+\"                                   { yytext = yytext.slice(1,-1); return 'STRING'; }
[a-zA-Z_][a-zA-Z$_0-9]*                     { return 'IDENTIFIER'; }
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
<<EOF>>                                     { return 'EOF'; }
.                                           { console.log("INVALID: " + yytext); return 'INVALID'}

/lex

%left ';'
%left EMPTY
%left ','
%left '+' '-'
%left '*'
%left '**'
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
    : polCommitedDeclaration
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
    | plookupIdentity
        {
            $$ = $1;
        }
    | include
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
            setLines($$.expression, @1, @3);
        }
    ;

plookupIdentity
    : expression 'in' expression
        {
            $$ = {type: "PLOOKUPIDENTITY", f: $1, t: $3}
            setLines($$, @1, @3);
        }
    ;


polCommitedDeclaration
    : 'pol' elementType 'commited' polNamesList
        {
            $$ = {type: "POLCOMMTEDDECLARATION", names: $4, elementType: $2}
            setLines($$, @1, @4);
        }
    | 'pol' 'commited' polNamesList
        {
            $$ = {type: "POLCOMMTEDDECLARATION", names: $3, elementType: "field"}
            setLines($$, @1, @3);
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
    : polNamesList ',' IDENTIFIER
        {
            $1.push($3);
            $$ = $1;
        }
    | IDENTIFIER
        {
            $$ = [$1];
        }
    ;

namespaceDef
    : 'namespace' IDENTIFIER
        {
            $$ = {type: "NAMESPACE", namespace: $2}
            setLines($$, @1, @2);
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
    | IDENTIFIER '.' IDENTIFIER
        {
            $$ = {op: "pol", next: false, namespace: $1, name: $3}
        }
    | IDENTIFIER
        {
            $$ = {op: "pol", next: false, namespace: "this", name: $1}
        }
    ;