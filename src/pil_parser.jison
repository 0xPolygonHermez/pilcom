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
%right NO_STAGE STAGE
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
const DEFAULT_STAGE = 1;
const util = require('util');
// const Expression = require('./Expression.js');
function showcode(title, info) {
    console.log(title+` ${info.last_line}:${info.last_column}`);
}
//         console.log(`STATE ${state} ${(this.terminals_[symbol] || symbol)}`);
%}

%start all_top_level_blocks

%% /* language grammar */

all_top_level_blocks
    : top_level_blocks EOF
        { $$ = $1; return $$; }
    ;

top_level_blocks
    : top_level_blocks lopcs top_level_block
        { $$ = $1; $$.push($3); }
    |
        { $$ = []; }
    ;

lopcs
    : lopcs CS %prec CS
    | %prec EMPTY
    ;

top_level_block
    : namespace_definition
        { $$ = $1; }

    | subproof_definition
        { $$ = $1; }

    | function_definition
        { $$ = $1; }

    | include_directive
        { $$ = $1; }
    ;

namespace_definition
    : NAMESPACE IDENTIFIER '::' IDENTIFIER '{' statement_block '}'
        {
            $$ = {type: "namespace", namespace: $4, monolithic: false, subproof: $2, statements: $6 }
        }
    | NAMESPACE IDENTIFIER '::' '{' statement_block '}'
        {
            $$ = {type: "namespace", namespace: '', monolithic: false, subproof: $2, statements: $5}
        }
    | NAMESPACE IDENTIFIER '(' expression ')' '{' statement_block '}'
        {
            $$ = {type: "namespace", namespace: $2, monolithic: true, subproof: false, exp: $4, statements: $7 }
        }
    ;


delimited_statement
    : non_delimited_statement  // %prec non_delimited_statement
        { $$ = $1; }

    | statement_no_closed
        { $$ = $1; }
    ;

non_delimited_statement
    : statement_closed %prec LESS_CS
        { $$ = $1; }

    | statement_closed lcs %prec CS
        { $$ = $1; }

    | lcs %prec CS

    | statement_no_closed lcs %prec CS
        { $$ = $1; }

    | '{' statement_block '}'
        { $$ = $2; }
    ;

statement_list
    : statement_list_closed
        { $$ = $1; }

    | statement_list_closed statement_no_closed
        { $$.push($2); }

    | statement_no_closed
        { $$ = [$1]; }
    ;

statement_list_closed
    : statement_list_closed statement_closed
        { $$.push($2); }

    | statement_list_closed statement_closed lcs
        { $$.push($2); }

    | statement_list_closed statement_no_closed lcs
        { $$.push($2); }

    | statement_closed
        { $$ = [$1]; }

    | statement_closed lcs
        { $$ = [$1]; }

    | statement_no_closed lcs
        { $$ = [$1]; }

    | lcs
    ;

statement_block
    : statement_list
        { $$ = $1; }

    | %prec EMPTY

    ;

lcs
    : lcs CS
    | CS
    ;

when_boundary
    : %empty

    | FIRST
        { $$ = { boundary: 'first' }}

    | LAST
        { $$ = { boundary: 'last' }}

    | TRANSITION
        { $$ = { boundary: 'transition', frame: false }}

    | TRANSITION FRAME '=' NUMBER
        { $$ = { boundary: 'transition', frame: $4 }}
    ;

statement_closed
    : codeblock_closed
        { $$ = { type: "code", statements: $1 }; }

    | WHEN when_boundary expression "{" when_body "}"
        { $$ = { type: "when", statements: $1, expression: $3, ...$2 }; }

    | METADATA '{' data_object '}'
        { $$ = $1; }

    | function_definition
        { $$ = $1; }
    ;

function_definition
    : FUNCTION IDENTIFIER '(' arguments ')' ':' '[' return_type_list ']' '{' statement_block '}'
        { $$ = { type: 'function_definition', funcname: $2, arguments: $4, returns: $8, statements: $11 }}

    | FUNCTION IDENTIFIER '(' arguments ')' ':' return_type '{' statement_block '}'
        { $$ = { type: 'function_definition', funcname: $2, arguments: $4, returns: $7, statements: $9 }}

    | FUNCTION IDENTIFIER '(' arguments ')' '{' statement_block '}'
        { $$ = { type: 'function_definition', funcname: $2, arguments: $4, returns: false, statements: $7 }}
    ;

arguments
    : arguments_list
        { $$ = $1 }

    | arguments_list ',' DOTS_FILL
        { $$ = {...$1, varargs: true } }

    | DOTS_FILL
        { $$ = {args: [], varargs: false }}

    | %prec EMPTY
        { $$ = {args: [], varargs: false } }
    ;

arguments_list
    : arguments_list ',' argument

    | argument
        { $$ = $1 }
    ;

argument
    : basic_type IDENTIFIER
        { $$ = {type: $1.type, name: $2, reference: false, dim: 0} }

    | basic_type REFERENCE
        { $$ = {type: $1.type, name: $2.substr(1), reference: true, dim: 0} }

    | basic_type IDENTIFIER type_array
        { $$ = {type: $1.type, name: $2, reference: false, dim: $3.dim} }

    | basic_type REFERENCE type_array
        { $$ = {type: $1.type, name: $2.substr(1), reference: true, dim: $3.dim} }
    ;

basic_type
    : INTEGER
        { $$ = {type: 'integer'} }

    | FE
        { $$ = {type: 'fe'} }

    | EXPR
        { $$ = {type: 'expr'} }

    | COL
        { $$ = {type: 'col'} }

    | CHALLENGE
        { $$ = {type: 'challenge'} }

    | T_STRING
        { $$ = {type: 'string'} }
    ;

return_type_list
    : return_type_list ',' return_type
        { $$ = [...$1, $3] }

    | return_type
        { $$ = [$1] }
    ;

type_array
    : type_array '[' ']'
        { $$ = {dim: $1.dim + 1} }

    | '[' ']'
        { $$ = {dim: 1} }
    ;

return_type
    : basic_type
        { $$ = { type: $1.type, dim: 0 } }

    | basic_type type_array
        { $$ = { type: $1.type, dim: $2.dim } }
    ;

statement_no_closed
    : codeblock_no_closed
        { $$ = { type: 'code', statements: $1 } }

    | col_declaration
        { $$ = $1 }

    | GLOBAL col_declaration
        { $$ = $1 }

    | challenge_declaration
        { $$ = $1 }

    | GLOBAL challenge_declaration
        { $$ = $1 }

    | expression
        { $$ = $1 }

    | expression '===' expression
        { $$ = {type: 'constraint', left: $1, right: $3 } }

    | include_directive
        { $$ = $1 }

    | public_declaration
        { $$ = $1 }

    | constant_definition
        { $$ = $1 }
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
        }
    ;

codeblock_no_closed
    : variable_declaration
        {
           $$ = $1;
        }
    | variable_assignment
        {
            $$ = $1;
        }
    | variable_multiple_assignment
        {
            $$ = $1;
        }
    | return_statement
        {
            $$ = $1;
        }
    | DO delimited_statement WHILE '(' expression ')'
        {

        }
    | CONTINUE
        {   $$.type = 'continue'; }
    | BREAK
        {   $$.type = 'break'; }
    ;

list_subproof
    : %prec EMPTY
    | IDENTIFIER '::'
    ;

in_expression
    : expression
    | list_subproof '[' expression_list ']'
    ;

codeblock_closed
    : FOR '(' for_init CS expression CS variable_assignment_list ')' non_delimited_statement
        { $$ = {type: 'for', init: $3, condition: $5, increment: $7, statements: $9 } }

    | FOR '(' for_init IN in_expression ')' non_delimited_statement
        { $$ = {type: 'for', init: $3, list: $5, statements: $7 } }

    | WHILE '(' expression ')' non_delimited_statement
        { $$ = {type: 'while', condition: $3, statements: $5 } }

    | CASE '(' expression ')''{' case_list '}'
        { $$ = $1 }

    | IF '(' expression ')' non_delimited_statement %prec IF_NO_ELSE
        { $$ = {type:'if', conditions: [{type: 'if', expression: $3, statements: $5 }] } }

    | IF '(' expression ')' non_delimited_statement ELSE non_delimited_statement
        { $$ = { type:'if', conditions: [{type: 'if', expression: $3, statements: $5 }, {type: 'else', statements: $7}]} }
    ;

case_list
    : case_list case_item
    | case_item
    ;

case_item
    : expression_list ':' non_delimited_statement
    | ELSE non_delimited_statement
    ;

for_assignation
    : variable_assignment
    | INC pol_id
        {   $$.delta = 'pre-inc'; }
    | DEC pol_id
        {   $$.delta = 'pre-dec'; }
    | pol_id INC
        {   $$.delta = 'post-inc'; }
    | pol_id DEC
        {   $$.delta = 'post-dec'; }
    ;

for_init
    : variable_declaration
        {   $$ = $1; }
    | variable_assignment
        {   $$ = $1; }
    | col_declaration
        {   $$ = $1; }
    ;

variable_declaration
    : INTEGER variable_init
        {   $$ = {type: 'integer', ...$2 } }
    | FE variable_init
        {   $$ = {type: 'fe', ...$2 } }
    | EXPR variable_init
        {   $$ = {type: 'expr', ...$2 } }
    | T_STRING variable_init
        {   $$ = {type: 'string', ...$2 } }
    ;


variable_init
    : IDENTIFIER variable_array
        {   $$ = {name: $1, ...$2} }
    | IDENTIFIER variable_array '=' expression
        {   $$ = {name: $1, init: $4, ...$2} }
/*    | IDENTIFIER variable_array '=' range_definition
        {
            $$ = {name: $1, init: $3};
        }*/
    | REFERENCE variable_array
        {   $$ = {name: $1, reference: true, ...$2} }
    | REFERENCE variable_array '=' expression
        {   $$ = {name: $1, reference: true, init: $4, ...$2} }
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
        }
    | left_variable_multiple_assignment '=' '[' expression_list ']'
        {
            $$ = {type: 'assign', name: $1, value: $3}
        }
    ;

variable_assignment
    : pol_id assign_operation expression %prec EMPTY
        {
            $$ = {type: 'assign', name: $1, value: $3}
        }
    | pol_id '=' sequence_definition
        {
            $$ = {type: 'assign', name: $1, value: $3}
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
    : STAGE NUMBER %prec STAGE
        {
            $$ = { stage: $2 }
        }
    | %prec NO_STAGE
        {
            $$ = { stage: DEFAULT_STAGE }
        }
    ;

constraint
    : expression '===' expression
        {
            $$ = {type: "PolIdentity", expression: { op: "sub", values: [$1,$3] }};
        }
    ;

flexible_string
    : STRING
        { $$ = $1 }

    | TEMPLATE_STRING
        { $$ = $1 }
    ;


sequence_definition
    : '[' sequence_list ']'
        { $$ = {type: 'sequence', values: $1} }

    | '[' sequence_list ']' DOTS_FILL
        { $$ = {type: 'sequence', values: [{type: 'padding_seq', value: $2}] } }
    ;

sequence_list
    : sequence_list ',' sequence
        { $$ = [...$1, $2] }

    | sequence_list ',' DOTS_ARITH_SEQ ',' sequence
        { $$ = [...$1, { type: 'arith_seq', final: true }, $5] }

    | sequence_list ',' DOTS_GEOM_SEQ ',' sequence
        { $$ = [...$1, { type: 'geom_seq', final: true }, $5] }

    | sequence_list ',' DOTS_ARITH_SEQ
        { $$ = [...$1, { type: 'arith_seq', final: false }] }

    | sequence_list ',' DOTS_GEOM_SEQ
        { $$ = [...$1, { type: 'geom_seq', final: false }] }

    | sequence
        { $$ = [$1] }
    ;

sequence
    : sequence ':' expression
        { $$ = {type: 'repeat_seq', value: $1, times: $3} }

    | sequence DOTS_RANGE sequence
        { $$ = {type: 'range_seq', from: $1, to: $3} }

    | sequence DOTS_FILL
        { $$ = {type: 'padding_seq', value: $1} }

    | '[' sequence_list ']'
        { $$ = {type: 'seq_list', values: $1} }

    | expression
        { $$ = $1 }
    ;

multiple_expression_list
    : multiple_expression_list ',' expression %prec ','
        { $$ = [...$1, $3] }

    | multiple_expression_list ',' list_subproof '[' expression_list ']' %prec ','
        { $$ = [...$1, $4] }

    | list_subproof '[' expression_list ']'
        { $$ = [$2] }

    | expression
        { $$ = [$1] }
    ;

expression_list
    : expression_list ',' DOTS_FILL expression %prec ','
        { $$ = [...$1, { append: $3 }] }

    | expression_list ',' expression %prec ','
        { $$ = [...$1, $3] }

    | DOTS_FILL expression
        { $$ = { append: $2 } }

    | expression
        { $$ = [$1] }
    ;

col_declaration_array
    : '[' ']'
        { $$ = {dim: 1, lenghts: [null]} }

    | '[' expression_list ']'
        { $$ = {dim: 1, lengths: [$2]} }

    | col_declaration_array '[' ']'
        { $$ = {...$1, dim: $1.dim + 1, lengths: [...$1.lengths, null] } }

    | col_declaration_array '[' expression_list ']'
        { $$ = {...$1, dim: $1.dim + 1, lengths: [...$1.lengths, $3] } }
    ;

col_declaration_item
    : col_declaration_ident %prec NO_STAGE

    | col_declaration_ident col_declaration_array

    ;

col_declaration_ident
    : IDENTIFIER
        { $$ = {name: $1}}

    | REFERENCE
        { $$ = {name: $1.substr(1), reference: true}}

    | TEMPLATE_STRING
        { $$ = {name: $1, template: true}}
    ;

col_declaration_list
    : col_declaration_list ',' col_declaration_item
        { $$ = $1; $$.cols.push($3); }

    | col_declaration_item
        { $$.cols = [$1]; }
    ;


/*
    (1) initialization only allowed with single non-array column (col_declaration_ident)
*/

col_declaration
    : COL col_declaration_list stage_definition
        {
            $$ = { ...$1, type: 'col_declaration', cols: $2.cols, stage: $3.stage };
        }
    | COL col_declaration_ident stage_definition '=' expression  // (1)
        {
            $$ = { ...$1, type: 'col_declaration', k: 1, cols: [$2.col], stage: $3.stage, init: $5 };
        }
    | COL WITNESS col_declaration_list stage_definition function_call
        {
            $$ = { ...$1, type: 'witness_col_declaration', cols: [$2.col], stage: $4.stage };
        }
    | COL FIXED col_declaration_list stage_definition
        {
            $$ = { ...$1, type: 'fixed_col_declaration', k: 2, cols: [$2.col], stage: $4.stage };
        }
    | COL FIXED col_declaration_ident stage_definition '=' expression  // (1)
        {
            $$ = { ...$1, type: 'fixed_col_declaration', k:3, cols: [$2.col], stage: $4.stage, init: $6 };
        }
    | COL FIXED col_declaration_ident stage_definition '=' sequence_definition  // (1)
        {
            $$ = { ...$1, type: 'fixed_col_declaration', k:4,cols: [$2.col], stage: $4.stage, sequence: $6 };
        }
    ;

challenge_declaration
    : CHALLENGE col_declaration_list stage_definition
    ;

public_declaration
    : PUBLIC IDENTIFIER '=' pol_id '(' expression ')'
        { $$ = {type: "public_declaration", name: $2, pol: $4, idx: $6} }
    ;


subproof_definition
    : SUBPROOF IDENTIFIER '(' expression_list ')'
        { $$ = {type: 'subproof', name: $2, rows: $4} }
    ;

constant_definition
    : CONST IDENTIFIER '=' expression
        { $$ = {type: 'constant_definition', name: $2, value: $4} }

    | CONST IDENTIFIER '=' sequence_definition
        { $$ = {type: "constant_definition", name: $2, value: $4} }
    ;


/* */
expression
    : expression EQ expression
        { $$ = { op: "eq", values: [$1, $3] } }

    | expression NE expression
        { $$ = { op: "ne", values: [$1, $3] } }

    | expression LT expression
        { $$ = { op: "lt", values: [$1, $3] } }

    | expression GT expression
        { $$ = { op: "gt", values: [$1, $3] } }

    | expression LE expression
        { $$ = { op: "le", values: [$1, $3] } }

    | expression GE expression
        { $$ = { op: "ge", values: [$1, $3] } }

    | expression IN expression %prec IN
        { $$ = { op: "ge", values: [$1, $3] } }

    | expression IS return_type %prec IS
        { $$ = { op: "is", values: [$1, $3] } }

    | expression AND expression %prec AND
        { $$ = { op: "and", values: [$1, $3] } }

    | expression '?' expression ':' expression %prec '?'
        { $$ = { op: 'if', condition: $1, values: [$3, $5] } }

    | expression B_AND expression %prec AND
        { $$ = { op: "band", values: [$1, $3] } }

    | expression B_OR expression %prec AND
        { $$ = { op: "bor", values: [$1, $3] } }

    | expression B_XOR expression %prec AND
        { $$ = { op: "bxor", values: [$1, $3] } }

    | expression OR expression %prec OR
        { $$ = { op: "or", values: [$1, $3] } }

    | expression SHL expression %prec AND
        { $$ = { op: "shl", values: [$1, $3] } }

    | expression SHR expression %prec OR
        { $$ = { op: "shr", values: [$1, $3] } }

    | '!' expression %prec '!'
        { $$ = { op: "not", values: [$2] } }

    | expression '+' expression %prec '+'
        { $$ = { op: "add", values: [$1, $3] } }

    | expression '-' expression %prec '-'
        { $$ = { op: "sub", values: [$1, $3] } }

    | expression '*' expression %prec '*'
        { $$ = { op: "mul", values: [$1, $3] } }

    | expression '%' expression %prec '%'
        { $$ = { op: "mod", values: [$1, $3] } }

    | expression '/' expression %prec '/'
        { $$ = { op: "div", values: [$1, $3] } }

    | expression '\\' expression %prec '\\'
        { $$ = { op: "intdiv", values: [$1, $3] } }

    | expression POW expression %prec POW
        { $$ = { op: "pow", values: [$1, $3] } }

    | '+' expression %prec UPLUS
        { $$ = $2 }

    | '-' expression %prec UMINUS
        { $$ = { op: "neg", values: [$2] } }

    | ':' IDENTIFIER
        { $$ = {op: "public", name: $2 } }          // public could be don't use ':'

    | pol_id
        { $$ = {...$1, delta: false} }

    | INC pol_id
        { $$ = {...$1, inc: 'pre'} }

    | DEC pol_id
        { $$ = {...$1, dec: 'pre'} }

    | pol_id INC
        { $$ = {...$1, inc: 'post'} }

    | pol_id DEC
        { $$ = {...$1, dec: 'post'} }

    | NUMBER %prec EMPTY
        { $$ = {op: "number", value: BigInt($1) } }

    | flexible_string %prec EMPTY
        { $$ = {op: "string", value: $1 } }

    | '(' expression ')'
        { $$ = $2 }

    | function_call
        { $$ = $1 }

/*    | method_call  method or property, solve conflict SR.
        { $$ = $1 }*/
    ;

pol_id
    : name_optional_index "'" %prec LOWER_PREC
        { $$ = {...$1, next:1 } }

    | name_optional_index "'" NUMBER
        { $$ = {...$1, next:$3 } }

    | name_optional_index "'" '(' expression ')'
        { $$ = {...$1, next:$4 } }

    | "'" name_optional_index %prec LOWER_PREC
        { $$ = {...$2, prior:1 } }

    | NUMBER "'" name_optional_index
        { $$ = {...$3, prior:$1 } }

    | '(' expression ')' "'" name_optional_index
        { $$ = {...$5, prior:$2 } }

    | name_optional_index
        { $$ = $1 }
    ;

name_optional_index
    : name_reference
        { $$ = {...$1, dim: 0 } }

    | name_reference array_index
        { $$ = {...$1, ...$2} }
    ;

array_index
    :   array_index '[' expression_list ']'
        { $$ = {dim: $1.dim + 1, indexes: [...$1.indexes, $3]} }

    |   '[' expression_list ']'
        { $$ = {dim: 1, indexes: [$2]} }
    ;


name_reference
    : IDENTIFIER '.' IDENTIFIER
        { $$ = {op: 'pol', next: false, subproof: 'this', namespace: $1, name: $3} }

    | IDENTIFIER '::' IDENTIFIER '.' IDENTIFIER
        { $$ = {op: 'pol', next: false, subproof: $1, namespace: $3, name: $5} }

    | IDENTIFIER
        { $$ = {op: 'col', next: false, subproof: 'this', namespace: 'this', name: $1} }

    | IDENTIFIER '::' IDENTIFIER
        { $$ = {op: 'col', next: false, subproof: $1, namespace: '', name: $3} }

    | '::' IDENTIFIER
        { $$ = {op: 'col', next: false, subproof: 'this', namespace: '', name: $2} }
    ;
