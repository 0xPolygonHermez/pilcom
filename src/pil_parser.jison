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
    : 'pol' 'commited' polNamesList
        {
            $$ = {type: "POLCOMMTEDDECLARATION", names: $3}
            setLines($$, @1, @3);
        }
    ;

polConstantDeclaration
    : 'pol' 'constant' polNamesList
        {
            $$ = {type: "POLCONSTANTDECLARATION", names: $3}
            setLines($$, @1, @3);
        }
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