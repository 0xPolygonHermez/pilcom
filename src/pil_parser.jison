/* description: Construct AST for pil language. */

/* lexical grammar */
%lex

%%

\s+                                         { /* skip whitespace */ }
\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/ { /* console.log("MULTILINE COMMENT: "+yytext); */  }
\/\/.*                                      { /* console.log("SINGLE LINE COMMENT: "+yytext); */ }

col                                         { return 'COL'; }
witness                                     { return 'WITNESS'; }
fixed                                       { return 'FIXED'; }
namespace                                   { return 'NAMESPACE'; }
include                                     { return 'INCLUDE'; }
in                                          { return 'IN'; }
is                                          { return 'IS'; }
public                                      { return 'PUBLIC'; }
global                                      { return 'GLOBAL'; }
const                                       { return 'CONST'; }

integer                                     { return 'INTEGER' }
fe                                          { return 'FE' }
expr                                        { return 'EXPR' }
string                                      { return 'T_STRING' }
challenge                                   { return 'CHALLENGE' }

for                                         { return 'FOR' }
while                                       { return 'WHILE' }
do                                          { return 'DO' }
break                                       { return 'BREAK' }
continue                                    { return 'CONTINUE' }
if                                          { return 'IF' }
elseif                                      { return 'ELSEIF' }
else                                        { return 'ELSE' }
switch                                      { return 'SWITCH' }
case                                        { return 'CASE' }

when                                        { return 'WHEN' }
subproof                                    { return 'SUBPROOF' }
aggregable                                  { return 'AGGREGABLE' }
stage                                       { return 'STAGE' }

function                                    { return 'FUNCTION' }
return                                      { return 'RETURN' }

first                                       { return 'FIRST' }
last                                        { return 'LAST' }
frame                                       { return 'FRAME' }
transition                                  { return 'TRANSITION' }

\.\.\+\.\.                                  { return 'DOTS_ARITH_SEQ' }
\.\.\*\.\.                                  { return 'DOTS_GEOM_SEQ' }
\.\.\.                                      { return 'DOTS_FILL' }
\.\.                                        { return 'DOTS_RANGE' }

(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*) { yytext = yytext.replace(/\_/g, ""); return 'NUMBER'; }

\"[^"]+\"                                   { yytext = yytext.slice(1,-1); return 'STRING'; }
\`[^`]+\`                                   { yytext = yytext.slice(1,-1); return 'TEMPLATE_STRING'; }
[a-zA-Z_][a-zA-Z$_0-9]*                     { return 'IDENTIFIER'; }
\&[a-zA-Z_][a-zA-Z$_0-9]*                   { return 'REFERENCE'; }
\@[a-zA-Z_][a-zA-Z$_0-9]*                   { yytext = yytext.slice(1); return 'METADATA'; }
\*\*                                        { return 'POW'; }
\+\+                                        { return 'INC'; }
\-\-                                        { return 'DEC'; }
\+\=                                        { return '+='; }
\-\=                                        { return '-='; }
\*\=                                        { return '*='; }
\+                                          { return '+'; }
\-                                          { return '-'; }
\*                                          { return '*'; }
\'                                          { return "'"; }
\?                                          { return "?"; }
\%                                          { return "%"; }
\/                                          { return "/"; }
\\                                          { return "\\"; }
\;                                          { return 'CS'; }
\,                                          { return ','; }
\.                                          { return '.'; }
\&\&                                        { return 'AND'; }
\|\|                                        { return 'OR'; }
\&                                          { return 'B_AND'; }
\|                                          { return 'B_OR'; }
\^                                          { return 'B_XOR'; }
\<\<                                        { return 'SHL'; }
\>\>                                        { return 'SHR'; }
\<\=                                        { return 'LE'; }
\>\=                                        { return 'GE'; }
\<                                          { return 'LT'; }
\>                                          { return 'GT'; }
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
\:\:                                        { return '::'; }
\:                                          { return ':'; }
\!                                          { return '!'; }
<<EOF>>                                     { return 'EOF'; }
.                                           { console.log("INVALID: " + yytext); return 'INVALID'}

/lex

%left '}'
%left LESS_CS
%left CS
%nonassoc EMPTY
%nonassoc NUMBER
%nonassoc NON_DELIMITED_STATEMENT
%right IF_NO_ELSE ELSE
%left '?' ':'

%left ','
%left DOTS_FILL DOTS_RANGE
%left DOTS_GEOM_SEQ DOTS_ARITH_SEQ
%right '=' '*=' '+=' '-='
%right '?'
// %left '?'
%left OR
%left AND
%left B_OR
%left B_XOR
%left B_AND
%left IN IS
%left EQ NE
%left LT GT EQ NE LE GE
%left SHL SHR
%left '+' '-'
%left '*' "\\" '/' '%'
%left POW
%left '[' ']'
%left "'"
%left '.'
%right INC DEC UMINUS UPLUS '!'

%nonassoc '('

%{
const util = require('util');
// const Expression = require('./Expression.js');
function setLines(dst, first, last) {
    last = last || first;
    dst.first_line = first.first_line;
    dst.first_column = first.first_column;
    dst.last_line = last.last_line;
    dst.last_column = last.last_column;
}
function showcode(title, info) {
    console.log(title+` ${info.last_line}:${info.last_column}`);
}
//         console.log(`STATE ${state} ${(this.terminals_[symbol] || symbol)}`);
%}

%start all_statements

%% /* language grammar */

all_statements
    : statement_block EOF
        {
            // console.log(JSON.stringify($1, null, 1));
            $$ = $1;
            return $$
        }
    ;

delimited_statement
    : non_delimited_statement  // %prec non_delimited_statement
    | statement_no_closed
    ;

non_delimited_statement
    : statement_closed %prec LESS_CS
    | statement_closed lcs %prec CS
        {
            $$ = $1;
        }
    | lcs %prec CS
    | statement_no_closed lcs %prec CS
        {
            $$ = $1;
        }
    | '{' statement_block '}'
        {
            $$ = $2;
        }
    ;

statement_list
    : statement_list_closed
        {
            $$ = $1;
        }
    | statement_list_closed statement_no_closed
        {
            $$.push($2);
        }
    | statement_no_closed
        {
            $$ = [$1];
        }
    ;

statement_list_closed
    : statement_list_closed statement_closed
        {
            $$.push($2);
        }
    | statement_list_closed statement_closed lcs
        {
            $$.push($2);
        }
    | statement_list_closed statement_no_closed lcs
        {
            $$.push($2);
        }
    | statement_closed
        {
            $$ = [$1];
        }
    | statement_closed lcs
        {
            $$ = [$1];
        }
    | statement_no_closed lcs
        {
            $$ = [$1];
        }
    | lcs
        {
            $$ = [$1];
        }
    ;

statement_block
    : statement_list
        {
            showcode('R statement_block 1', @0);
            $$ = $1;
        }
    | %prec EMPTY
    ;

lcs
    : lcs CS
    | CS
    ;

when_boundary
    : %empty
    | FIRST
    | LAST
    | TRANSITION
    | TRANSITION FRAME '=' NUMBER
    ;

statement_closed
    : codeblock_closed
        {
            $$ = { type: "Code", statments: $1 };
        }
    | WHEN when_boundary expression "{" when_body "}"
        {
            $$ = { type: "When", statments: $1 };
        }
    | METADATA '{' data_object '}'
        {
            $$ = $1;
        }
    | FUNCTION IDENTIFIER '(' arguments ')' ':' '[' return_type_list ']' '{' statement_block '}'
    | FUNCTION IDENTIFIER '(' arguments ')' ':' return_type '{' statement_block '}'
    | FUNCTION IDENTIFIER '(' arguments ')' '{' statement_block '}'
    ;

arguments
    : arguments_list
    | arguments_list ',' DOTS_FILL
    | DOTS_FILL
    |
    ;

arguments_list
    : arguments_list ',' argument
    | argument
    ;

argument
    : argument_type IDENTIFIER
    | argument_type REFERENCE
    | argument_type IDENTIFIER '['']'
    | argument_type REFERENCE '['']'
    ;

argument_type
    : INTEGER
    | FE
    | EXPR
    | COL
    | CHALLENGE
    | T_STRING
    ;

return_type_list
    : return_type_list ',' return_type
    | return_type
    ;

return_type_array
    : return_type_array '[' ']'
    | '[' ']'
    ;

return_type
    : return_basic_type
    | return_basic_type return_type_array
    ;

return_basic_type
    : INTEGER
    | FE
    | EXPR
    | COL
    | CHALLENGE
    | T_STRING
    ;


statement_no_closed
    : codeblock_no_closed
        {
            $$ = { type: "Code", statments: $1 };
        }
    | col_declaration
        {
            $$ = $1;
        }
    | GLOBAL col_declaration
        {
            $$ = $1;
        }
    | challenge_declaration
        {
            $$ = $1;
        }
    | GLOBAL challenge_declaration
        {
            $$ = $1;
        }
    | namespace_definition
        {
            $$ = $1;
        }
    | subproof_definition
        {
            $$ = $1;
        }
    | expression
        {
            $$ = $1;
        }
    | expression '===' expression
        {
            $$ = {type: "constraint", expression: { op: "sub", values: [$1,$3] }};
            setLines($$, @1, @3);
        }
    | include_directive
        {
            $$ = $1
        }
    | public_declaration
        {
            $$ = $1
        }
    | constant_definition
        {
            $$ = $1
        }
    ;


data_value
    : expression
    | '{' data_object '}'
    | '[' data_array ']'
    ;

data_object
    : data_object ',' IDENTIFIER ':' data_value
    | IDENTIFIER ':' data_value
    ;

data_array
    : data_array ',' data_value
    | data_value
    ;

when_body
    : when_body CS constraint
        {
            $$ = $1;
            $$.push($3);
        }
    | when_body CS
        {
            $$ = $1;
        }
    | constraint
        {
            $$ = [$1];
        }
    ;

function_call
    : name_reference '(' multiple_expression_list ')'
        {
           // function call
           $$ = { type: 'call', function: $1, arguments: $3 };
           setLines($$, @1, @4);
        }
    ;

codeblock_no_closed
    : variable_declaration
        {
           $$ = $1;
           console.log($1);
           setLines($$, @1, @1);
        }
    | variable_assignment
        {
            $$ = $1;
            console.log($1);
        }
    | variable_multiple_assignment
        {
            $$ = $1;
            console.log($1);
        }
    | return_statement
        {
            $$ = $1;
            console.log($1);
        }
    | DO delimited_statement WHILE '(' expression ')'
        {

           setLines($$, @1, @8);
        }
    | CONTINUE
        {
           $$ = { type: 'continue' };
           setLines($$, @1, @1);
        }
    | BREAK
        {
           $$ = { type: 'break' };
           setLines($$, @1, @1);
        }
    ;

in_expression
    : expression
    | '[' expression_list ']'
    ;

codeblock_closed
    : FOR '(' for_init CS expression CS variable_assignment_list ')' non_delimited_statement
        {
           $$ = {type: 'for', init: $3, condition: $5, increment: $7, statments: $9 };
           setLines($$, @1, @9);
        }
    | FOR '(' for_init IN in_expression ')' non_delimited_statement
        {
           $$ = {type: 'for', init: $3, list: $5, statments: $7 };
           setLines($$, @1, @7);
        }
    | WHILE '(' expression ')' non_delimited_statement
        {
           $$ = {type: 'while', condition: $3, statments: $5 };
           setLines($$, @1, @5);
        }
    | SWITCH '(' expression ')' '{' case_list '}'
        {

           setLines($$, @1, @7);
        }
    | IF '(' expression ')' non_delimited_statement %prec IF_NO_ELSE
        {
            $$ = {type:'if', conditions: [{type: 'if', expression: $3, statments: $5 }] };
            setLines($$, @1, @5);
        }
    | IF '(' expression ')' non_delimited_statement ELSE non_delimited_statement
        {
           $$ = { type:'if', conditions: [{type: 'if', expression: $3, statments: $5 }, {type: 'else', statments: $7}]};
           setLines($$, @1, @7);
        }
    ;

case_list
    : case_list case_item
    | case_item
    ;

case_item
    : CASE expression ':' non_delimited_statement
    | ELSE non_delimited_statement
    ;

for_assignation
    : variable_assignment
    | INC pol_id
        {
            $$ = $1
            setLines($$, @2);
        }
    | DEC pol_id
        {
            $$ = $1
            setLines($$, @2);
        }
    | pol_id INC
        {
            $$ = $1
            setLines($$, @2);
        }
    | pol_id DEC
        {
            $$ = $1
            setLines($$, @2);
        }
    ;

for_init
    : variable_declaration
        {
            $$ = $1;
        }
    | variable_assignment
        {
            $$ = $1;
        }
    | col_declaration
    ;

variable_declaration
    : INTEGER variable_init
        {
            $$ = $2;
            $$.type = 'var';
        }
    | FE variable_init
        {
            $$ = $2;
            $$.type = 'var';
        }
    | EXPR variable_init
        {
            $$ = $2;
            $$.type = 'expr';
        }
    | T_STRING variable_init
        {
            $$ = $2;
            $$.type = 'string';
        }
    ;

variable_init
    : IDENTIFIER variable_array
        {
            $$ = {name: $1}
        }
    | IDENTIFIER variable_array '=' expression
        {
            $$ = {name: $1, init: $3};
        }
/*    | IDENTIFIER variable_array '=' range_definition
        {
            $$ = {name: $1, init: $3};
        }*/
    | REFERENCE variable_array
        {
            $$ = {name: $1, reference: true}
        }
    | REFERENCE variable_array '=' expression
        {
            $$ = {name: $1, reference: true, init: $3};
        }
    ;

variable_array
    : %prec EMPTY
    | '[' expression ']'
    ;

return_statement
    : RETURN
    | RETURN expression
    | RETURN '[' expression_list ']'
    ;

assign_operation
    : '='
    | '+='
    | '-='
    | '*='
    ;

left_variable_multiple_assignment_list
    : left_variable_multiple_assignment_list ',' pol_id
    | left_variable_multiple_assignment_list ','
    | pol_id
    ;

left_variable_multiple_assignment
    : '[' left_variable_multiple_assignment_list ']'
    | '[' left_variable_multiple_assignment_list ',' DOTS_FILL ']'
    ;

variable_multiple_assignment
    : left_variable_multiple_assignment '=' function_call
        {
            $$ = {type: 'assign', name: $1, value: $3}
            setLines($$, $1, $3);
        }
    | left_variable_multiple_assignment '=' '[' expression_list ']'
        {
            $$ = {type: 'assign', name: $1, value: $3}
            setLines($$, $1, $3);
        }
    ;

variable_assignment
    : pol_id assign_operation expression %prec EMPTY
        {
            $$ = {type: 'assign', name: $1, value: $3}
            setLines($$, $1, $3);
        }
    | pol_id '=' range_definition
        {
            $$ = {type: 'assign', name: $1, value: $3}
            setLines($$, $1, $3);
        }
    ;


variable_assignment_list
    : variable_assignment_list ',' for_assignation
    | for_assignation
    ;

include_directive
    : INCLUDE flexible_string
        {
            $$ = {type: "Include", file: $2}
        }
    ;

stage_definition
    : STAGE NUMBER
    | %prec EMPTY
    ;

constraint
    : expression '===' expression
        {
            $$ = {type: "PolIdentity", expression: { op: "sub", values: [$1,$3] }};
            setLines($$, @1, @3);
        }
    ;

flexible_string
    : STRING
        {
            $$ = $1;
        }
    | TEMPLATE_STRING
        {
            $$ = $1;
        }
    ;

// element...element
// element:n...element:n
// ...element
// element...
//
//


range_definition
    : '[' range_list ']'
    | '[' range_list ']' DOTS_FILL
    ;

range_list
    : range_list ',' range
    | range_list ',' DOTS_ARITH_SEQ ',' range
    | range_list ',' DOTS_GEOM_SEQ ',' range
    | range_list ',' DOTS_ARITH_SEQ
    | range_list ',' DOTS_GEOM_SEQ
    | range
    ;

range
    : range ':' expression
    | range DOTS_RANGE range
    | range DOTS_FILL
    | '[' range_list ']'
    | expression
    ;

multiple_expression_list
    : multiple_expression_list ',' expression %prec ','
        {
            $1.push($3);
        }
    | multiple_expression_list ',' '[' expression_list ']' %prec ','
        {
            $1.push($3);
        }
    | '[' expression_list ']'
        {
            $1.push($3);
        }
    | expression
        {
            $$ = [$1];
        }
    ;

expression_list
    : expression_list ',' expression %prec ','
        {
            $1.push($3);
        }
    | expression
        {
            $$ = [$1];
        }
    ;


col_declaration_array
    : '[' ']'
    | '[' expression_list ']'
    ;

col_declaration_item
    : col_declaration_ident
    | col_declaration_ident col_declaration_array
    ;

col_declaration_ident
    : IDENTIFIER
    | REFERENCE
    | TEMPLATE_STRING
    ;

col_declaration_list
    : col_declaration_list ',' col_declaration_item
    | col_declaration_item
    ;

col_declaration
    : COL col_declaration_list stage_definition
    | COL col_declaration_list stage_definition '=' expression
    | COL WITNESS col_declaration_list stage_definition
    | COL FIXED col_declaration_list stage_definition
    | COL FIXED col_declaration_list stage_definition '=' expression
    | COL FIXED col_declaration_list stage_definition '=' range_definition
    ;

challenge_declaration
    : CHALLENGE col_declaration_list stage_definition
    ;

public_declaration
    : PUBLIC IDENTIFIER '=' pol_id '(' expression ')'
        {
            $$ = {type: "PublicDeclaration", name: $2, pol: $4, idx: $6}
            setLines($$, @1, @4);
        }
    ;

namespace_definition
    : NAMESPACE IDENTIFIER SUBPROOF IDENTIFIER
        {
            $$ = {type: "Namespace", name: $2, subproof: $4}
            setLines($$, @1, @4);
        }
    | NAMESPACE IDENTIFIER '(' expression ')'
        {
            $$ = {type: "Namespace", name: $2, subproof: false, exp: $4}
            setLines($$, @1, @5);
        }
    ;

subproof_definition
    : SUBPROOF IDENTIFIER '(' expression_list ')'
        {
            $$ = {type: "Subproof", name: $2, exp: $4}
            setLines($$, @1, @5);
        }
    ;

constant_definition
    : CONST IDENTIFIER '=' expression
        {
            $$ = {type: "ConstantDefinition", name: $2, exp: $4}
            setLines($$, @1, @4);
        }
/*    | CONST IDENTIFIER '=' range_definition
        {
            $$ = {type: "ConstantDefinition", name: $2, exp: $4}
            setLines($$, @1, @4);
        }*/
    ;


/* */
expression
//    : '{' data_object '}'
//    | '[' expression_list ']'
//    | DOTS_ARITH_SEQ
//    | DOTS_GEOM_SEQ
//    | expression ':' expression %prec ':'
//    | expression DOTS_RANGE expression
//    | expression DOTS_FILL
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
            $$ = { op: "ge", values: [$1, $3],  };
            setLines($$, @1, @3);
        }
    | expression IN expression %prec IN
        {
            $$ = { op: "ge", values: [$1, $3],  };
            setLines($$, @1, @3);
        }
    | expression IS argument_type %prec IS
        {
            $$ = { op: "is", values: [$1, $3],  };
            setLines($$, @1, @3);
        }
    | expression AND expression %prec AND
        {
            $$ = { op: "and", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression '?' expression ':' expression %prec '?'
        {
            setLines($$, @1, @5);
        }
    | expression B_AND expression %prec AND
        {
            $$ = { op: "band", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression B_OR expression %prec AND
        {
            $$ = { op: "bor", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression B_XOR expression %prec AND
        {
            $$ = { op: "bxor", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression OR expression %prec OR
        {
            $$ = { op: "or", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression SHL expression %prec AND
        {
            $$ = { op: "shl", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression SHR expression %prec OR
        {
            $$ = { op: "shr", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | '!' expression %prec '!'
        {
            $$ = { op: "not", values: [$2] };
            setLines($$, @1, @2);
        }
    | expression '+' expression %prec '+'
        {
            // $$ = yy.parser.calculate.add($1,$3);
            $$ = { op: "add", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression '-' expression %prec '-'
        {
            $$ = { op: "sub", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression '*' expression %prec '*'
        {
            $$ = { op: "mul", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression '%' expression %prec '%'
        {
            $$ = { op: "mod", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression '/' expression %prec '/'
        {
            $$ = { op: "div", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression "\\" expression %prec "\\"
        {
            $$ = { op: "intdiv", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression POW expression %prec POW
        {
            $$ = { op: "pow", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | '+' expression %prec UPLUS
        {
            $$ = $2;
            setLines($$, @1, @2);
        }
    | '-' expression %prec UMINUS
        {
            $$ = { op: "neg", values: [$2] };
            setLines($$, @1, @2);
        }
    | ':' IDENTIFIER
        {
            $$ = {op: "public", name: $2 }
            setLines($$, @1, @2);
        }
    | pol_id
        {
            $$ = $1
            setLines($$, @1);
        }
    | INC pol_id
        {
            $$ = $1
            setLines($$, @2);
        }
    | DEC pol_id
        {
            $$ = $1
            setLines($$, @2);
        }
    | pol_id INC
        {
            $$ = $1
            setLines($$, @2);
        }
    | pol_id DEC
        {
            $$ = $1
            setLines($$, @2);
        }
    | NUMBER %prec EMPTY
        {
            $$ = {op: "number", value: BigInt($1) }
            setLines($$, @1);
        }
    | flexible_string %prec EMPTY
        {
            $$ = {op: "string", value: $1 }
            setLines($$, @1);
        }
    | '(' expression ')'
        {
            $$ = $2;
            setLines($$, @1, @3);
        }
    | function_call
        {
            $$ = $1;
        }
    ;

/*    | '(' expression ')'
        {
            $$ = $2;
        }*/

/*
expression
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
            $$ = { op: "ge", values: [$1, $3],  };
            setLines($$, @1, @3);
        }
    | expression IN expression
        {
            $$ = { op: "ge", values: [$1, $3],  };
            setLines($$, @1, @3);
        }
    | expression IS argument_type
        {
            $$ = { op: "is", values: [$1, $3],  };
            setLines($$, @1, @3);
        }
    ;

expression
    : expression AND expression
        {
            $$ = { op: "and", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | expression OR expression
        {
            $$ = { op: "or", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | '!' expression
        {
            $$ = { op: "not", values: [$2] };
            setLines($$, @1, @2);
        }
    | '(' expression ')'
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
    | e4 '%' e3
        {
            $$ = { op: "mod", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | e4 '/' e3
        {
            $$ = { op: "div", values: [$1, $3] };
            setLines($$, @1, @3);
        }
    | e3 %prec EMPTY
        {
            $$ = $1;
        }
    ;

e3
    : e3 POW e2
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
    | pol_id
        {
            $$ = $1
            setLines($$, @1);
        }
    | INC pol_id
        {
            $$ = $1
            setLines($$, @2);
        }
    | DEC pol_id
        {
            $$ = $1
            setLines($$, @2);
        }
    | pol_id INC
        {
            $$ = $1
            setLines($$, @2);
        }
    | pol_id DEC
        {
            $$ = $1
            setLines($$, @2);
        }
    ;


e1
    : NUMBER %prec EMPTY
        {
            $$ = {op: "number", value: BigInt($1) }
            setLines($$, @1);
        }
    | TRUE
    | FALSE
    | flexible_string %prec EMPTY
        {
            $$ = {op: "string", value: $1 }
            setLines($$, @1);
        }
    | '(' expression ')'
        {
            $$ = $2;
            setLines($$, @1, @3);
        }
    | function_call
        {
            $$ = $1;
        }
    ;
*/

pol_id
    : name_optional_index "'" %prec LOWER_PREC
        {
            $1.next=1;
            $$ = $1;
        }
    | name_optional_index "'" NUMBER
        {
            $1.next=$3;
            $$ = $1;
        }
    | name_optional_index "'" '(' expression ')'
        {
            $1.next=$4;
            $$ = $1;
        }
    | "'" name_optional_index %prec LOWER_PREC
        {
            $1.prior=1;
            $$ = $2;
        }
    | NUMBER "'" name_optional_index
        {
            $1.prior=$1;
            $$ = $3;
        }
    | '(' expression ')' "'" name_optional_index
        {
            $1.prior=$2;
            $$ = $4;
        }
    | name_optional_index
        {
            $$ = $1;
        }
    ;

name_optional_index
    : name_reference
        {
            $$ = $1;
        }
    | name_reference array_index
        {
            $$ = $1;
            $$.idxExp = $2;
            setLines($$, @1, @2);
        }
    ;

array_index
    :   array_index '[' expression ']'
    |   '[' expression ']'
    ;

name_reference
    : IDENTIFIER '.' IDENTIFIER
        {
            $$ = {op: "pol", next: false, namespace: $1, name: $3}
            setLines($$, @1, @3);
        }
    | IDENTIFIER '::' IDENTIFIER '.' IDENTIFIER
        {
            $$ = {op: "pol", next: false, namespace: $1, name: $3}
            setLines($$, @1, @3);
        }
    | IDENTIFIER
        {
            $$ = {op: "pol", next: false, namespace: "this", name: $1}
            setLines($$, @1, @1);
        }
    ;
