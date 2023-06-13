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
constant                                    { return 'CONSTANT' }
prover                                      { return 'PROVER' }

int                                         { return 'INT' }
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
default                                     { return 'DEFAULT' }

when                                        { return 'WHEN' }
subair                                      { return 'SUBAIR' }
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
\&[a-zA-Z_][a-zA-Z$_0-9]*                   { yytext = yytext.slice(1); return 'REFERENCE'; }
\@[a-zA-Z_][a-zA-Z$_0-9]*                   { yytext = yytext.slice(1); return 'METADATA'; }
\$[0-9][0-9]*                               { yytext = yytext.slice(1); return 'POSITIONAL_PARAM'; }
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
\\\\                                        { return "\\\\"; }
\/                                          { return "/"; }
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
%left DOTS_REPEAT       // ':' when means repetition
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
const Expression = require('../src/expression.js');

function showcode(title, info) {
    console.log(title+` ${info.last_line}:${info.last_column}`);
}
function runtime_expr(value) {
    let res = { type: 'expr', expr: new Expression() };
    if (value.type) {
        delete value.type;
    }
    res.expr.setRuntime(value);
    return res;
}
function insert_expr(e, op, ...values) {
    // let res = e;
    // e.expr = new Expression();
    // console.log(e);
    // console.log(op);
    // console.log(values);
    let exprs = values.map((x) => x.expr);
    e.expr.insert.apply(e.expr, [op, ...exprs]);
    return e;
}
//         console.log(`STATE ${state} ${(this.terminals_[symbol] || symbol)}`);
%}

%start all_top_level_blocks

%% /* language grammar */

all_top_level_blocks
    : top_level_blocks lopcs EOF
        { $$ = $1; return $$; }
    ;

top_level_blocks
    : top_level_blocks lopcs top_level_block
        { $$ = [...$1, $3] } }
    |
        { $$ = [] }
    ;

lopcs
    : lopcs CS %prec CS
    |  %prec EMPTY
    ;

top_level_block
    : namespace_definition
        { $$ = $1 }

    | subair_definition
        { $$ = $1 }

    | function_definition
        { $$ = $1 }

    | include_directive
        { $$ = $1 }

    | col_declaration
        { $$ = $1 }

    | GLOBAL col_declaration
        { $$ = $1 }

    | challenge_declaration
        { $$ = $1 }

    | GLOBAL challenge_declaration
        { $$ = $1 }

    | public_declaration
        { $$ = $1 }

    | prover_declaration
        { $$ = $1 }

    | constant_definition
        { $$ = $1 }
    ;

namespace_definition
    : NAMESPACE IDENTIFIER '::' IDENTIFIER '{' statement_block '}'
        {
            $$ = {type: 'namespace', namespace: $4, monolithic: false, subair: $2, statements: $6.statements };
        }
    | NAMESPACE IDENTIFIER '::' '{' statement_block '}'
        {
            $$ = {type: 'namespace', namespace: '', monolithic: false, subair: $2, statements: $5.statements }
        }
    | NAMESPACE IDENTIFIER '(' expression ')' '{' statement_block '}'
        {
            $$ = {type: 'namespace', namespace: $2, monolithic: true, subair: false, exp: $4, statements: $7.statements }
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
        { $$ = { type: 'scope_definition', ...$2 }; }
    ;

statement_list
    : statement_list_closed
        { $$ = $1 }

    | statement_list_closed statement_no_closed
        { $$ = $1; $$.statements.push($2); }

    | statement_no_closed
        { $$ = $1 }
    ;

statement_list_closed
    : statement_list_closed statement_closed
        { $$ = { ...$1, statements: [ ...$1.statements, $2 ] } }

    | statement_list_closed statement_closed lcs
        { $$ = { ...$1, statements: [ ...$1.statements, $2 ] } }

    | statement_list_closed statement_no_closed lcs
        { $$ = { ...$1, statements: [ ...$1.statements, $2 ] } }

    | statement_closed
        { $$ = { statements: [$1] } }

    | statement_closed lcs
        { $$ = { statements: [$1] } }

    | statement_no_closed lcs
        { $$ = { statements: [$1] } }

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

    // TODO_

when_boundary
    : %empty
        { $$ = { boundary: 'all' }}

    | FIRST
        { $$ = { boundary: 'first' }}

    | LAST
        { $$ = { boundary: 'last' }}

    | FRAME
        { $$ = { boundary: 'frame' }}
    ;

statement_closed
    : codeblock_closed
        { $$ = { type: 'code', statements: $1 }; }

    | WHEN when_boundary expression "{" when_body "}"
        { $$ = { type: 'when', statements: $1, expression: $3, ...$2 }; }

/*    | WHEN when_boundary '(' expression ')' constraint CS
        { $$ = { type: "when", statements: $1, expression: $3, ...$2 }; }*/

    | METADATA '{' data_object '}'
        { $$ = { type: 'metadata', data: $3 } }

    | function_definition
        { $$ = $1 }
    ;

function_definition
    : FUNCTION IDENTIFIER '(' arguments ')' ':' '[' return_type_list ']' '{' statement_block '}'
        { $$ = { type: 'function_definition', funcname: $2, ...$4, returns: $8, ...$11 }}

    | FUNCTION IDENTIFIER '(' arguments ')' ':' return_type '{' statement_block '}'
        { $$ = { type: 'function_definition', funcname: $2, ...$4, returns: $7, ...$9 }}

    | FUNCTION IDENTIFIER '(' arguments ')' '{' statement_block '}'
        { $$ = { type: 'function_definition', funcname: $2, ...$4, returns: false, ...$7 }}
    ;

arguments
    : arguments_list
        { $$ = $1 }

    | arguments_list ',' DOTS_FILL
        { $$ =  $1; $$.vargs = true }

    | DOTS_FILL
        { $$ = { args: [], varargs: false }}

    | %prec EMPTY
        { $$ = { args: [], varargs: false } }
    ;

arguments_list
    : arguments_list ',' argument
        { $$ = $1; $$.args.push($3) }
    | argument
        { $$ = { args: [ $1 ] } }
    ;

argument
    : basic_type IDENTIFIER
        { $$ = { type: $1.type, name: $2, reference: false, dim: 0 } }

    | basic_type REFERENCE
        { $$ = { type: $1.type, name: $2, reference: true, dim: 0 } }

    | basic_type IDENTIFIER type_array
        { $$ = { type: $1.type, name: $2, reference: false, dim: $3.dim } }

    | basic_type REFERENCE type_array
        { $$ = { type: $1.type, name: $2, reference: true, dim: $3.dim } }
    ;

basic_type
    : INT
        { $$ = { type: 'int' } }

    | FE
        { $$ = { type: 'fe' } }

    | EXPR
        { $$ = { type: 'expr' } }

    | COL
        { $$ = { type: 'col' } }

    | CHALLENGE
        { $$ = { type: 'challenge' } }

    | T_STRING
        { $$ = { type: 'string' } }

    | PROVER
        { $$ = { type: 'prover' } }

    | PUBLIC
        { $$ = { type: 'public' } }

    | FUNCTION
        { $$ = { type: 'function' } }
    ;

return_type_list
    : return_type_list ',' return_type
        { $$ = {returns: [...$1, $3]}  }

    | return_type
        { $$.returns = [$1] }
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

    | prover_declaration
        { $$ = $1 }

    | constant_definition
        { $$ = $1 }
    ;

data_value
    : expression
        { $$ = $1 }

    | '{' data_object '}'
        { $$ = $2 }

    | '[' data_array ']'
        { $$ = $1; $$.data[$3] = $5 }
    ;

data_object
    : data_object ',' IDENTIFIER ':' data_value
        { $$ = $1; $$.data[$3] = $5 }

    | IDENTIFIER ':' data_value
        { $$ = {data: {}}; $$.data[$1] = $3 }
    ;

data_array
    : data_array ',' data_value
        { $$ = $1; $$.values.push($3) }

    | data_value
        { $$ = { values: [ $1 ]} }
    ;

when_body
    : when_body CS constraint
        { $$ = { ...$1, constraints: [ ...$1.constraints, $3 ] } }

    | when_body CS
        { $$ = $1 }

    | constraint
        { $$ = { constraints: [$1] } }
    ;

function_call
    : name_optional_index '(' multiple_expression_list ')'
        { $$ = { op: 'call', function: $1, arguments: $3.values } }
    ;

codeblock_no_closed
    : variable_declaration
        { $$ = $1 }

    | variable_assignment
        { $$ = $1 }

    | variable_multiple_assignment
        { $$ = $1 }

    | return_statement
        { $$ = $1 }

    | DO delimited_statement WHILE '(' expression ')'
        { $$ = $1 }

    | CONTINUE
        { $$ = { type: 'continue' } }

    | BREAK
        { $$ = { type: 'break' } }
    ;

list_subair
    : %prec EMPTY
    | IDENTIFIER '::'
        { $$ = { subair: $1 } }
    ;

in_expression
    : expression
        { $$ = $1 }

    | list_subair '[' expression_list ']'
        { $$ = { ...$1, ...$3 } }
    ;

codeblock_closed
    : FOR '(' for_init CS expression CS variable_assignment_list ')' non_delimited_statement
        { $$ = { type: 'for', init: $3, condition: $5, increment: $7.statements, statements: $9 } }

    | FOR '(' for_init IN in_expression ')' non_delimited_statement
        { $$ = { type: 'for_in', init: $3, list: $5, statements: $7 } }

    | WHILE '(' expression ')' non_delimited_statement
        { $$ = { type: 'while', condition: $3, statements: $5 } }

    | SWITCH '(' expression ')' case_body
        { $$ = $1 }

    | IF '(' expression ')' non_delimited_statement %prec IF_NO_ELSE
        { $$ = {type:'if', conditions: [{type: 'if', expression: $3, statements: $5 }] } }

    | IF '(' expression ')' non_delimited_statement ELSE non_delimited_statement
        { $$ = { type:'if', conditions: [{type: 'if', expression: $3, statements: $5 }, {type: 'else', statements: $7}]} }
    ;

case_body
    : '{' case_list '}'
        { $$ = $2 }

    | '{' case_list DEFAULT statement_list '}'
        { $$ = $2; $$.cases.push({ else: true, statements: $4 }) }
    ;

case_value
    : case_value ',' expression
        { $$ = $1; $$.values.push($3) }

    | case_value ',' expression DOTS_RANGE expression
        { $$ = $1; $$.values.push({ from: $3, to: $5 }) }

    | expression
        { $$ = { values: [$1] } }

    | expression DOTS_RANGE expression
        { $$ = { values: [{ from: $1, to: $3 }] } }
    ;

case_list
    : case_list CASE case_value ':' statement_list_closed
        { $$ = $1; $$.cases.push({condition: $3, statements: $5 }) }

    | CASE case_value ':' statement_list_closed
        { $$ = {cases: [{ condition: $2, statements: $4 }]} }
    ;

for_assignation
    : variable_assignment
        { $$ = $1 }

    | INC pol_id
        { $$ = { ...$2, type: 'variable_increment', pre: 1n, post: 0n } }

    | DEC pol_id
        { $$ = { ...$2, type: 'variable_increment', pre: -1n, post: 0n } }

    | pol_id INC
        { $$ = { ...$1, type: 'variable_increment', pre: 0n, post: 1n } }

    | pol_id DEC
        { $$ = { ...$1, type: 'variable_increment', pre: 0n, post: -1n } }
    ;

for_init
    : variable_declaration
        { $$ = $1; }

    | variable_assignment
        { $$ = $1 }

    | pol_id
        { $$ = $1 }

    | col_declaration
        { $$ = $1 }
    ;

variable_declaration
    : INT variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'int', items: $2.items } }

    | FE variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'fe', items: $2.items } }

    | EXPR variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'expr', items: $2.items } }

    | SUBAIR '::' EXPR variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'expr', items: $4.items } }

    | T_STRING variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'string', items: $2.items } }

    | FUNCTION variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'function', items: $2.items } }

    | INT variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'int', items: [$2], init: [$4] } }

    | FE variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'fe', items: [$2], init: [$4] } }

    | EXPR variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'expr', items: [$2], init: [$4] } }

    | SUBAIR '::' EXPR variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'expr', external: true, items: [$4], init: [$6] } }

    | T_STRING variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'string', items: [$2], init: [$4] } }

    | FUNCTION variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'function', items: [$2], init: [$4] } }

    | INT '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'int', items: $3.items, init: $7 } }

    | FE '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'fe', items: $3.items, init: $7 } }

    | EXPR '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'expr', items: $3.items, init: $7 } }

    | SUBAIR '::' EXPR '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'expr', items: $5.items, init: $9 } }

    | T_STRING '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'string', items: $3.items, init: $7 } }
    ;

variable_declaration_array
    : '[' ']'
        { $$ = { dim: 1, lengths: [null]} }

    | '[' expression ']'
        { $$ = { dim: 1, lengths: [$2]} }

    | variable_declaration_array '[' ']'
        { $$ = $1; ++$$.dim; $$.lengths.push(null) }

    | variable_declaration_array '[' expression ']'
        { $$ = $1; ++$$.dim; $$.lengths.push($3) }
    ;

variable_declaration_item
    : variable_declaration_ident %prec NO_STAGE
        { $$ = $1 }

    | variable_declaration_ident variable_declaration_array
        { $$ = { ...$1, ...$2 } }
    ;

variable_declaration_ident
    : IDENTIFIER
        { $$ = { name: $1 } }

    | REFERENCE
        { $$ = { name: $1, reference: true } }
    ;

variable_declaration_list
    : variable_declaration_list ',' variable_declaration_item
        { $$ = $1; $$.items.push({...$3, _d_:1}); }

    | variable_declaration_item
        { $$ = {items: [{...$1, _d_:2}]} }
    ;

return_statement
    : RETURN
        { $$ = { type: 'return', value: null } }

    | RETURN expression
        { $$ = { type: 'return', value: $2 } }

    | RETURN '[' expression_list ']'
        { $$ = { type: 'return', values: $3 } }

    ;

assign_operation
    : '='
        { $$ = { type: 'assign' } }

    | '+='
        { $$ = { type: 'increment' } }

    | '-='
        { $$ = { type: 'substract' } }

    | '*='
        { $$ = { type: 'product' } }
    ;

left_variable_multiple_assignment_list
    : left_variable_multiple_assignment_list ',' pol_id
        { $$ = $1; $$.names.push($1) }

    | left_variable_multiple_assignment_list ','
        { $$ = $1; $$.names.push({ type: 'ignore' }) }

    | pol_id
        { $$ = { names: [$1] } }
    ;

left_variable_multiple_assignment
    : '[' left_variable_multiple_assignment_list ']'
        { $$ = $1 }

    | '[' left_variable_multiple_assignment_list ',' DOTS_FILL ']'
        { $$ = $1; $$.names.push({ type: 'ignore' }) }
    ;

variable_multiple_assignment
    : left_variable_multiple_assignment '=' function_call
        { $$ = {type: 'assign', name: $1, value: $3 }  }

    | left_variable_multiple_assignment '=' '[' expression_list ']'
        { $$ = {type: 'assign', name: $1, value: $3 } }
    ;

variable_assignment
    : pol_id assign_operation expression %prec EMPTY
        { $$ = { type: 'assign', assign: $2.type, name: $1, value: $3 } }

    | pol_id '=' sequence_definition
        { $$ = { type: 'assign', name: $1, value: $3 } }
    ;


variable_assignment_list
    : variable_assignment_list ',' for_assignation
        { $$ = $1; $$.statements.push($3); }

    | for_assignation
        { $$ = { statements: [$1] } }
    ;

include_directive
    : INCLUDE flexible_string
        { $$ = { type: 'include', file: $2 } }
    ;

stage_definition
    : STAGE '(' NUMBER ')' %prec STAGE
        { $$ = { stage: $2 } }

    | %prec NO_STAGE
        { $$ = { stage: DEFAULT_STAGE } }
    ;

constraint
    : expression '===' expression
        { $$ = { type: 'constraint', value: { type:'expr', op: 'sub', values: [$1,$3] , constraint: true }} }
    ;

flexible_string
    : STRING
        { $$ = { type: 'string', value: $1 } }

    | TEMPLATE_STRING
        { $$ = { type: 'template', value: $1 } }
    ;


sequence_definition
    : '[' sequence_list ']'
        { $$ = {type: 'sequence', values: $2.values} }

    | '[' sequence_list ']' DOTS_FILL
        { $$ = {type: 'sequence', values: [{type: 'padding_seq', value: $2}] } }

    | '[' sequence_list ']' ':' expression
        { $$ = {type: 'sequence', values: [{type: 'repeat_seq', value: $2, times: $5}]} }

    | '[' sequence_list ']' ':' expression DOTS_FILL
        { $$ = {type: 'sequence', values: [{type: 'padding_seq', value: {type: 'repeat_seq', value: $2, times: $5}}]} }
    ;


sequence_list
    : sequence_list ',' sequence
        { $$ = $1; $$.values.push($3) }

    | sequence_list ',' expression ':' expression
        { $$ = $1; $$.values.push({type: 'repeat_seq', value: $3, times: $5}) }

    | sequence_list ',' expression DOTS_ARITH_SEQ expression
        { $$ = $1; $$.values.push({type: 'arith_seq', t1: $$.values.pop(), t2: $3, tn: $5}) }

    | sequence_list ',' expression DOTS_GEOM_SEQ expression
        { $$ = $1; $$.values.push({type: 'geom_seq', t1: $$.values.pop(), t2: $3, tn: $5}) }

    | sequence_list ',' expression ':' expression DOTS_ARITH_SEQ expression ':' expression
        { $$ = $1; $$.values.push({type: 'arith_seq', t1: $$.values.pop(),
                                   t2: {type: 'repeat_seq', value: $3, times: $5},
                                   tn: {type: 'repeat_seq', value: $7, times: $9}}) }

    | sequence_list ',' expression ':' expression DOTS_GEOM_SEQ expression ':' expression
        { $$ = $1; $$.values.push({type: 'geom_seq', t1: $$.values.pop(),
                                   t2: {type: 'repeat_seq', value: $3, times: $5},
                                   tn: {type: 'repeat_seq', value: $7, times: $9}}) }

    | sequence_list ',' expression DOTS_ARITH_SEQ
        { $$ = $1; $$.values.push({type: 'arith_seq', t1: $$.values.pop(), t2: $3, tn: false}) }

    | sequence_list ',' expression DOTS_GEOM_SEQ
        { $$ = $1; $$.values.push({type: 'geom_seq', t1: $$.values.pop(), t2: $3, tn: false}) }

    | sequence_list ',' expression ':' expression DOTS_ARITH_SEQ
        { $$ = $1; $$.values.push({type: 'arith_seq', t1: $$.values.pop(),
                                   t2: {type: 'repeat_seq', value: $3, times: $5},
                                   tn: false}) }

    | sequence_list ',' expression ':' expression DOTS_GEOM_SEQ
        { $$ = $1; $$.values.push({type: 'geom_seq', t1: $$.values.pop(),
                                   t2: {type: 'repeat_seq', value: $3, times: $5},
                                   tn: false}) }

    | sequence
        { $$ = { type: 'seq_list', values: [$1] } }

    | expression ':' expression
        { $$ = { type: 'seq_list', values: [{type: 'repeat_seq', value: $1, times: $3}] } }
    ;

sequence
    : sequence ':' expression
        { $$ = {type: 'repeat_seq', value: $1, times: $3} }

    | expression DOTS_RANGE expression %prec EMPTY
        { $$ = {type: 'range_seq', from: $1, to: $3} }

    | expression DOTS_RANGE expression ':' expression  %prec DOTS_REPEAT
        { $$ = {type: 'range_seq', from: $1, to: {times: $5, ...$3}} }

    | expression ':' expression DOTS_RANGE expression %prec EMPTY
        { $$ = {type: 'range_seq', from: {times: $3, ...$1}, to: $5}}

    | expression ':' expression DOTS_RANGE expression ':' expression %prec DOTS_REPEAT
        { $$ = {type: 'range_seq', from: {times: $3, ...$1}, to: {times: $7, ...$5}} }

    | sequence DOTS_FILL
        { $$ = {type: 'padding_seq', value: $1} }

    | '[' sequence_list ']'
        { $$ = {type: 'seq_list', values:  [$2]} }

    | expression %prec EMPTY
        { $$ = $1 }
    ;

multiple_expression_list
    : multiple_expression_list ',' expression %prec ','
        { $$ = $1; $$.values.push($3) }

    | multiple_expression_list ',' list_subair '[' expression_list ']' %prec ','
        { $$ = $1; $$.values.push({ type: 'expression_list', subair: $4, values: $5.values }) }

    | list_subair '[' expression_list ']'
        { $$ = { type: 'expression_list', subair: $1, values: $3.values } }

    | expression
        { $$ = { type: 'expression_list', values: [$1] } }
    ;

expression_list
    : expression_list ',' DOTS_FILL expression %prec ','
        { $$ = $1; $$.values.push({ type: 'append', value: $4 }) }

    | expression_list ',' expression %prec ','
        { $$ = $1; $$.values.push($3) }

    | DOTS_FILL expression
        { $$ = { type: 'expression_list',  values: [{ type: 'append', value: $2}] } }

    | expression
        { $$ = { type: 'expression_list',  values: [$1] } }
    ;

declaration_array
    : '[' ']'
        { $$ = { dim: 1, lengths: [null] } }

    | '[' expression ']'
        { $$ = { dim: 1, lengths: [$2] } }

    | declaration_array '[' ']'
        { $$ = { ...$1, dim: $1.dim + 1, lengths: [...$1.lengths, null] } }

    | declaration_array '[' expression ']'
        { $$ = { ...$1, dim: $1.dim + 1, lengths: [...$1.lengths, $3] } }
    ;

col_declaration_item
    : col_declaration_ident %prec NO_STAGE
        { $$ = $1 }

    | col_declaration_ident declaration_array
        { $$ = {...$1, ...$2} }
    ;

col_declaration_ident
    : IDENTIFIER
        { $$ = { name: $1 } }

    | REFERENCE
        { $$ = { name: $1, reference: true } }

    | TEMPLATE_STRING
        { $$ = { name: $1, template: true } }
    ;

col_declaration_list
    : col_declaration_list ',' col_declaration_item
        { $$ = { items: [ ...$1.items, $3 ] } }

    | col_declaration_item
        { $$ = { items: [$1] } }
    ;


/*
    (1) initialization only allowed with single non-array column (col_declaration_ident)
*/

col_declaration
    : COL col_declaration_list stage_definition
        { $$ = { type: 'col_declaration', items: $2.items, stage: $3.stage }; }

    | COL col_declaration_ident stage_definition '=' expression  // (1)
        { $$ = { type: 'col_declaration', items: [$2], stage: $3.stage, init: $5 } }

    | COL WITNESS col_declaration_list stage_definition
        { $$ = { type: 'witness_col_declaration', items: $3.items, stage: $4.stage } }

    | COL FIXED col_declaration_list stage_definition
        { $$ = { type: 'fixed_col_declaration', items: $3.items, stage: $4.stage } }

    | COL FIXED col_declaration_ident stage_definition '=' expression  // (1)
        { $$ = { type: 'fixed_col_declaration', items: [$3], stage: $4.stage, init: $6 } }

    | COL FIXED col_declaration_ident stage_definition '=' sequence_definition  // (1)
        { $$ = { type: 'fixed_col_declaration',  items: [$3], stage: $4.stage, sequence: $6 } }

    | SUBAIR '::' COL col_declaration_list stage_definition
        { $$ = { type: 'col_declaration', external: true, items: $4.items, stage: $5.stage } }

    | SUBAIR '::' COL col_declaration_ident stage_definition '=' expression  // (1)
        { $$ = { type: 'col_declaration', external: true, items: [$4], stage: $5.stage, init: $7 } }

    | SUBAIR '::' COL WITNESS col_declaration_list stage_definition
        { $$ = { type: 'witness_col_declaration', external: true, items: $5.items, stage: $6.stage } }

    | SUBAIR '::' COL FIXED col_declaration_list stage_definition
        { $$ = { type: 'fixed_col_declaration', external: true, items: $5.items, stage: $6.stage } }

    | SUBAIR '::' COL FIXED col_declaration_ident stage_definition '=' expression  // (1)
        { $$ = { type: 'fixed_col_declaration', external: true, items: [$5], stage: $6.stage, init: $8 } }

    | SUBAIR '::' COL FIXED col_declaration_ident stage_definition '=' sequence_definition  // (1)
        { $$ = { type: 'fixed_col_declaration', external: true, items: [$5], stage: $6.stage, sequence: $8 } }
    ;

challenge_declaration
    : CHALLENGE col_declaration_list stage_definition
        { $$ = { type: 'challenge_declaration', items: $2.items, stage: $3.stage } }
    ;

public_declaration
    : PUBLIC col_declaration_ident '=' expression
        { $$ = { type: 'public_declaration', items: [$2], init: $4 } }

    | PUBLIC col_declaration_list
        { $$ = { type: 'public_declaration', items: $2.items } }
    ;

prover_declaration
    : PROVER col_declaration_ident '=' expression
        { $$ = { type: 'prover_declaration', items: [$2], init: $4 } }

    | PROVER col_declaration_list
        { $$ = { type: 'prover_declaration', items: $2.items } }
    ;


subair_definition
    : SUBAIR IDENTIFIER '(' expression_list ')'
        { $$ = { type: 'subair_definition', name: $2, rows: $4 } }
    ;

constant_definition
    : CONSTANT IDENTIFIER '=' expression
        { $$ = { type: 'constant_definition', name: $2, value: $4 } }

//    | CONSTANT IDENTIFIER '[' expression ']' '=' sequence_definition
//        { $$ = { type: "constant_definition", name: $2, dim:1, lengths: [$4], sequence: $7 } }
    | CONSTANT IDENTIFIER declaration_array '=' sequence_definition
        { $$ = { type: "constant_definition", name: $2, sequence: $5, ...$3 } }
    ;


/* */
expression
    : expression EQ expression
        { $$ = insert_expr($1, 'eq', $3) }

    | expression NE expression
        { $$ = insert_expr($1, 'ne', $3) }

    | expression LT expression
        { $$ = insert_expr($1, 'lt', $3) }

    | expression GT expression
        { $$ = insert_expr($1, 'gt', $3) }

    | expression LE expression
        { $$ = insert_expr($1, 'le', $3) }

    | expression GE expression
        { $$ = insert_expr($1, 'ge', $3) }

    | expression IN expression %prec IN
        { $$ = insert_expr($1, 'in', $3) }

    | expression IS return_type %prec IS
        { $$ = insert_expr($1, 'is', runtime_expr({op: 'type', vtype: $3.type, dim: $3.dim})) }

    | expression AND expression %prec AND
        { $$ = insert_expr($1, 'and', $3) }

    | expression '?' expression ':' expression %prec '?'
        { $$ = insert_expr($1, 'if', $3, $5) }

    | expression B_AND expression %prec AND
        { $$ = insert_expr($1, 'band', $3) }

    | expression B_OR expression %prec AND
        { $$ = insert_expr($1, 'bor', $3) }

    | expression B_XOR expression %prec AND
        { $$ = insert_expr($1, 'bxor', $3) }

    | expression OR expression %prec OR
        { $$ = insert_expr($1, 'or', $3) }

    | expression SHL expression %prec AND
        { $$ = insert_expr($1, 'shl', $3) }

    | expression SHR expression %prec OR
        { $$ = insert_expr($1, 'shr', $3) }

    | '!' expression %prec '!'
        { $$ = insert_expr($2, 'not') }

    | expression '+' expression %prec '+'
        { $$ = insert_expr($1, 'add', $3) }

    | expression '-' expression %prec '-'
        { $$ = insert_expr($1, 'sub', $3) }

    | expression '*' expression %prec '*'
        { $$ = insert_expr($1, 'mul', $3) }

    | expression '%' expression %prec '%'
        { $$ = insert_expr($1, 'mod', $3) }

    | expression '/' expression %prec '/'
        { $$ = insert_expr($1, 'div', $3) }

    | expression '\\' expression %prec '\\'
        { $$ = insert_expr($1, 'intdiv', $3) }

    | expression POW expression %prec POW
        { $$ = insert_expr($1, 'pow', $3) }

    | '+' expression %prec UPLUS
        { $$ = $2 }

    | '-' expression %prec UMINUS
        { $$ = insert_expr($2, 'neg') }

    | pol_id
        { $$ = runtime_expr($1) }

    | INC pol_id
        { $$ = runtime_expr({...$2, inc: 'pre'}) }

    | DEC pol_id
        { $$ = runtime_expr({...$2, dec: 'pre'}) }

    | pol_id INC
        { $$ = runtime_expr({...$1, inc: 'post'}) }

    | pol_id DEC
        { $$ = runtime_expr({...$1, dec: 'post'}) }

    | NUMBER %prec EMPTY
        { $$ = {type: 'expr', expr: new Expression() };
          $$.expr.setValue(BigInt($1)) }

    | flexible_string %prec EMPTY
        { $$ = runtime_expr({...$1, op: 'string'}) }

    | '(' expression ')'
        { $$ = $2 }

    | function_call
        { $$ = runtime_expr({...$1}) }

    | POSITIONAL_PARAM
        { $$ = runtime_expr({position: $1, op: 'positional_param'}) }

    | casting
        { $$ = runtime_expr({...$1}) }
    ;


// TODO: review real casting cases

casting
    : INT '(' expression ')'
        { $$ = { op: 'cast', cast: 'int', value: $3} }

    | FE '(' expression ')'
        { $$ = { op: 'cast', cast: 'fe', value: $3 } }

    | EXPR '(' expression ')'
        { $$ = { op: 'cast', cast: 'expr', value: $3 } }

    | COL '(' expression ')'
        { $$ = { op: 'cast', cast: 'col', value: $3 } }

    | T_STRING '(' expression ')'
        { $$ = { op: 'cast', cast: 'string', value: $3 } }

    | INT type_array '(' expression ')'
        { $$ = { ...$2, op: 'cast', cast: 'int', value: $4 } }

    | FE type_array '(' expression ')'
        { $$ = { ...$2, op: 'cast', cast: 'fe', value: $4 } }

    | EXPR type_array '(' expression ')'
        { $$ = { ...$2, op: 'cast', cast: 'expr', value: $4 } }

    | COL type_array '(' expression ')'
        { $$ = { ...$2, op: 'cast', cast: 'col', value: $4 } }

    | T_STRING type_array '(' expression ')'
        { $$ = { ...$2, op: 'cast', cast: 'string', value: $4 } }
    ;

pol_id
    : name_optional_index "'" %prec LOWER_PREC
        { $$ = { ...$1, next:1 } }

    | name_optional_index "'" NUMBER
        { $$ = { ...$1, next:$3 } }

    | name_optional_index "'" '(' expression ')'
        { $$ = { ...$1, next:$4 } }

    | name_optional_index "'" function_call
        { $$ = { ...$1, next:runtime_expr($3)  } }

    | name_optional_index "'" POSITIONAL_PARAM
        { $$ = { ...$1, next: runtime_expr({position: $3, op: 'positional_param'}) } }

    | "'" name_optional_index %prec LOWER_PREC
        { $$ = { ...$2, prior:1 } }

    | NUMBER "'" name_optional_index
        { $$ = { ...$3, prior:$1 } }

    | '(' expression ')' "'" name_optional_index
        { $$ = { ...$5, prior:$2 } }

    | function_call "'" name_optional_index
        { $$ = { ...$3, prior:runtime_expr($1) } }

    | POSITIONAL_PARAM "'" name_optional_index
        { $$ = { ...$3, prior:runtime_expr({position: $1, op: 'positional_param'}) } }

    | name_optional_index
        { $$ = $1 }
    ;

name_optional_index
    : name_reference
        { $$ = { ...$1, dim: 0 } }

    | name_reference array_index
        { $$ = { ...$1, ...$2 } }

    | REFERENCE
        { $$ = { name: $1, reference: true, dim: 0 } }

    | REFERENCE type_array
        { $$ = { name: $1, reference: true, ...$2 } }
    ;

array_index
    :   array_index '[' expression ']'
        { $$ = { dim: $1.dim + 1, indexes: [...$1.indexes, $3] } }

    |   '[' expression ']'
        { $$ = { dim: 1, indexes: [$2]} }
    ;


name_reference
    : IDENTIFIER '.' IDENTIFIER
        { $$ = { type: 'expr', op: 'reference', next: false, subair: 'this', namespace: $1, name: $3 } }

    | IDENTIFIER '::' IDENTIFIER '.' IDENTIFIER
        { $$ = { type: 'expr', op: 'reference', next: false, subair: $1, namespace: $3, name: $5 } }

    | IDENTIFIER
        { $$ = { type: 'expr', op: 'reference', next: false, subair: 'this', namespace: 'this', name: $1 } }

    | IDENTIFIER '::' IDENTIFIER
        { $$ = { type: 'expr', op: 'reference', next: false, subair: $1, namespace: '', name: $3 } }

    | '::' IDENTIFIER
        { $$ = { type: 'expr', op: 'reference', next: false, subair: 'this', namespace: '', name: $2 } }
    ;
