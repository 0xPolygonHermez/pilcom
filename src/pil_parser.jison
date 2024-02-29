/* description: Construct AST for pil language. */

/* lexical grammar */
%lex

%%

\s+                                         { /* skip whitespace */ }
\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/ { /* console.log("MULTILINE COMMENT: "+yytext); */  }
\/\/.*                                      { /* console.log("SINGLE LINE COMMENT: "+yytext); */ }
\#pragma\s+[^\r\n]*                         { yytext = yytext.replace(/^#pragma\s+/, ''); return 'PRAGMA'; }

col                                         { return 'COL'; }
witness                                     { return 'WITNESS'; }
fixed                                       { return 'FIXED'; }
container                                   { return 'CONTAINER'; }
declare                                     { return 'DECLARE'; }
use                                         { return 'USE'; }
alias                                       { return 'ALIAS'; }
include                                     { return 'INCLUDE'; }
in                                          { return 'IN'; }
is                                          { return 'IS'; }
publictable                                 { return 'PUBLIC_TABLE'; }
public                                      { return 'PUBLIC'; }
constant                                    { return 'CONSTANT' }
const                                       { return 'CONST' }
proofval                                    { return 'PROOF_VALUE' }
subproofval                                 { return 'SUBPROOF_VALUE' }
subproof                                    { return 'SUBPROOF' }
air                                         { return 'AIR' }
proof                                       { return 'PROOF' }

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
aggregate                                   { return 'AGGREGATE' }
stage                                       { return 'STAGE' }

once                                        { return 'ONCE' }
on                                          { return 'ON' }
private                                     { return 'PRIVATE' }
final                                       { return 'FINAL' }
function                                    { return 'FUNCTION' }
return                                      { return 'RETURN' }

first                                       { return 'FIRST' }
last                                        { return 'LAST' }
frame                                       { return 'FRAME' }
debugger                                    { return 'DEBUGGER' }

\.\.\+\.\.                                  { return 'DOTS_ARITH_SEQ' }
\.\.\*\.\.                                  { return 'DOTS_GEOM_SEQ' }
\.\.\.                                      { return 'DOTS_FILL' }
\.\.                                        { return 'DOTS_RANGE' }

(0x[0-9A-Fa-f][0-9A-Fa-f_]*)|([0-9][0-9_]*) { yytext = yytext.replace(/\_/g, ""); return 'NUMBER'; }

\"[^"]+\"                                   { yytext = yytext.slice(1,-1); return 'STRING'; }
\`[^`]+\`                                   { yytext = yytext.slice(1,-1); return 'TEMPLATE_STRING'; }
[a-zA-Z_][a-zA-Z$_0-9]*                     { return 'IDENTIFIER'; }
\&[a-zA-Z_][a-zA-Z$_0-9]*                   { yytext = yytext.slice(1); return 'REFERENCE'; }
\@[a-zA-Z_][a-zA-Z$_0-9]*                   { yytext = yytext.slice(1); return 'HINT'; }
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

%right ALIAS '{'
%left '}'
%left LESS_CS
%left CS
%nonassoc EMPTY
%nonassoc NUMBER
%nonassoc POSITIONAL_PARAM
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
%left INC_LEFT DEC_LEFT
%left NEXT

%nonassoc '('

%{
const DEFAULT_STAGE = 1;
const util = require('util');
const Expression = require('../src/expression.js');
const ExpressionFactory = require('../src/expression_factory.js');

function showcode(title, info) {
    console.log(title+` ${info.last_line}:${info.last_column}`);
}
/*
function runtime_expr(value) {
    let res = new Expression();
    if (value.type) {
        delete value.type;
    }
    res.setRuntime(value);
    return res;
}

function insert_expr(e, op, ...values) {
    // let res = e;
    // e.expr = new Expression();
    // console.log(e);
    // console.log(op);
    // console.log(values);
    e.insert.apply(e, [op, ...values]);
    return e;
}*/
//         console.log(`STATE ${state} ${(this.terminals_[symbol] || symbol)}`);
function implicit_scope(statements) {
    if (Array.isArray(statements)) {
        if (statements.length > 1) {
            return {type: 'scope_definition', statements};
        }
        statements = statements[0];
    }
    if (typeof statements.type === 'undefined') {
        return {type: 'scope_definition', ...statements};
    }
    if (statements.type === 'code') {
        statements.type = 'scope_definition';
        if (!Array.isArray(statements.statements)) {
            statements.statements = [statements.statements];
        }
        return statements;
    }
    if (statements.type === 'scope_definition') {
        return statements;
    }
    return {type: 'scope_definition',  statements};
}
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
    | %prec EMPTY
    ;

top_level_block
    /* : container_definition
        { $$ = $1 }
*/
    : subproof_definition
        { $$ = $1 }

    | proof_definition
        { $$ = $1 }

    | function_definition
        { $$ = $1 }

    | include_directive
        { $$ = $1 }

    | col_declaration
        { $$ = $1 }

    | challenge_declaration
        { $$ = $1 }

    | public_declaration
        { $$ = $1 }

    | public_table_declaration
        { $$ = $1 }

    | proof_value_declaration
        { $$ = $1 }

    | subproof_value_declaration
        { $$ = $1 }

/*    | constant_definition
        { $$ = $1 }
*/
    | variable_declaration
        { $$ = $1 }

    | DEBUGGER
        { $$ = { type: 'debugger' }}

    | PRAGMA
        { $$ = { type: 'pragma', value: $1 }}
    ;

use_directive
    : USE name_reference
        { $$ = { type: 'use', name: $2.name } }
    ;

no_closed_container_definition
    : CONTAINER name_reference
        { $$ = { type: 'container', name: $2.name, alias: false, statements: false } }

    | CONTAINER name_reference ALIAS IDENTIFIER
        { $$ = { type: 'container', name: $2.name, alias: $4, statements: false } }
    ;

closed_container_definition
    : CONTAINER name_reference '{' declare_block '}'
        { $$ = { type: 'container', name: $2.name, alias: false, statements: $4.statements } }

    | CONTAINER name_reference ALIAS IDENTIFIER '{' declare_block '}'
        { $$ = { type: 'container', name: $2.name, alias: $4, statements: $6.statements } }
    ;

proof_definition
    : PROOF '{' statement_block '}'
        { $$ = { type: 'proof', statements: $3.statements } }

    ;

non_delimited_statement
    : statement_closed %prec LESS_CS
        { $$ = $1; }

    | statement_closed lcs %prec CS
        { $$ = $1; }

    | lcs %prec CS

    | statement_no_closed lcs %prec CS
        { $$ = $1 }
/*
    | '{' statement_block '}'
        { $$ = { type: 'scope_definition', ...$2 }; }*/
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

declare_block
    : declare_list
        { $$ = $1; }

    | declare_list lcs
        { $$ = $1; }

    | %prec EMPTY

    ;

lcs
    : lcs CS
    | CS
    ;

    // TODO_

when_boundary
    : FIRST
        { $$ = { boundary: 'first' }}

    | LAST
        { $$ = { boundary: 'last' }}

    | FRAME
        { $$ = { boundary: 'frame' }}
    ;

statement_closed
    : codeblock_closed
        { $$ = { type: 'code', statements: $1 }; }

    | WHEN '(' expression ')' non_delimited_statement
        { $$ = { type: 'when', statements: $4, expression: $3 } }

    | WHEN when_boundary non_delimited_statement
        { $$ = { ...$2, type: 'when', statements: $3 } }

    | HINT '{' data_object '}'
       { $$ = { type: 'hint', name: $1, data: $3 } }

    | HINT '[' data_array ']'
        { $$ = { type: 'hint', name: $1, data: $3 }}

    | HINT expression CS
       { $$ = { type: 'hint', name: $1, data: $2 }}

    | function_definition
        { $$ = $1 }

    | closed_container_definition
        { $$ = $1 }

    | '{' statement_block '}'
        { $$ = { type: 'scope_definition', ...$2 }; }
    ;

function
    : FUNCTION IDENTIFIER
        { $$ = {private: false, funcname: $2} }

    | PRIVATE FUNCTION IDENTIFIER
        { $$ = {private: true, funcname: $3} }
    ;

function_definition
    : function '(' arguments ')' ':' '[' return_type_list ']' '{' statement_block '}'
        { $$ = { ...$1, type: 'function_definition', final: false, ...$3, returns: $7, ...$10 }}

    | function '(' arguments ')' ':' return_type '{' statement_block '}'
        { $$ = { ...$1, type: 'function_definition', final: false, ...$3, returns: $6, ...$8 }}

    | function '(' arguments ')' '{' statement_block '}'
        { $$ = { ...$1, type: 'function_definition', final: false, ...$3, returns: false, ...$6 }}

    | FINAL function '(' arguments ')' '{' statement_block '}'
        { $$ = { ...$2, type: 'function_definition', final: 'air', ...$4, returns: false, ...$7 }}

    | FINAL PROOF function '(' arguments ')' '{' statement_block '}'
        { $$ = { ...$3, type: 'function_definition', final: 'proof', ...$5, returns: false, ...$8 }}

    | FINAL SUBPROOF function '(' arguments ')' '{' statement_block '}'
        { $$ = { ...$3, type: 'function_definition', final: 'subproof', ...$5, returns: false, ...$8 }}

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

    | CONST INT
        { $$ = { type: 'int', const: true } }

    | CONST FE
        { $$ = { type: 'fe', const: true } }

    | CONST EXPR
        { $$ = { type: 'expr', const: true } }

    | COL WITNESS
        { $$ = { type: 'witness' } }

    | COL FIXED
        { $$ = { type: 'fixed' } }

    | CHALLENGE
        { $$ = { type: 'challenge' } }

    | T_STRING
        { $$ = { type: 'string' } }

    | CONST T_STRING
        { $$ = { type: 'string', const: true } }

    | PROOF_VALUE
        { $$ = { type: 'proof' } }

    | SUBPROOF_VALUE
        { $$ = { type: 'subproof' } }

    | AIR_VALUE
        { $$ = { type: 'air' } }

    | PUBLIC
        { $$ = { type: 'public' } }

    | PUBLIC_TABLE
        { $$ = { type: 'publicTable' } }

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

declare_list
    : declare_list lcs declare_item
        { $$ = $1; $$.statements.push($3); }

    | declare_item
        { $$ = { statements: [$1] } }
    ;

declare_item
    : col_declaration
        { $$ = $1 }

    | challenge_declaration
        { $$ = $1 }

    | public_declaration
        { $$ = $1 }

    | public_table_declaration
        { $$ = $1 }

    | proof_value_declaration
        { $$ = $1 }

    | subproof_value_declaration
        { $$ = $1 }

/*    | constant_definition
        { $$ = $1 }
*/
    | variable_declaration
        { $$ = $1 }
    ;

statement_no_closed
    : codeblock_no_closed
        { $$ = { type: 'code', statements: $1 } }

    | col_declaration
        { $$ = $1 }

    | challenge_declaration
        { $$ = $1 }

    | expression
        { $$ = { type: 'expr', expr: $1 } }

    | expression '===' expression
        { $$ = { type: 'constraint', left: $1, right: $3 } }

    | delayed_function_call
        { $$ = $1 }

    | include_directive
        { $$ = $1 }

    | public_declaration
        { $$ = $1 }

    | public_table_declaration
        { $$ = $1 }

    | proof_value_declaration
        { $$ = $1 }

    | subproof_value_declaration
        { $$ = $1 }

    | constant_definition
        { $$ = $1 }

    | no_closed_container_definition
        { $$ = $1 }

    | use_directive
        { $$ = $1 }
    ;


data_value
    : expression
        { $$ = $1 }

    | '{' data_object '}'
        { $$ = $2 }

    | '[' data_array ']'
        { $$ = $2 }
    ;

data_object
    : data_object ',' IDENTIFIER ':' data_value
        { $$ = $1; $$.data[$3] = $5 }

    | data_object ',' IDENTIFIER
        { $$ = $1; $$.data[$3] = ExpressionFactory.fromObject({type: 'reference', name: $3 }) }

    | IDENTIFIER ':' data_value
        { $$ = { type: 'object', data: {}}; $$.data[$1] = $3 }

    | IDENTIFIER
        { $$ = {data: {}}; $$.data[$1] = ExpressionFactory.fromObject({type: 'reference', name: $1 }) }
    ;

data_array
    : data_array ',' data_value
        { $$ = $1; $$.data.push($3) }

    | data_value
        { $$ = { type: 'array', data: [ $1 ] } }
    ;

function_call
    : name_optional_index '(' multiple_expression_list ')'
        { $$ = { type: 'call', function: $1, args: $3 } }
    ;

delayed_function_event
    : FINAL
      { $$ = $1 }
    ;

defined_scopes
    : AIR
        { $$ = $1 }

    | PROOF
        { $$ = $1 }

    | SUBPROOF
        { $$ = $1 }

    ;


delayed_function_call
    : ON delayed_function_event defined_scopes name_optional_index '(' multiple_expression_list ')'
        { $$ = { type: 'delayed_function_call', event: $2, scope: $3, function: $4, args: $6 } }
    ;


codeblock_no_closed
    : variable_declaration
        { $$ = $1 }

    | variable_assignment
        { $$ = $1 }

    | variable_multiple_assignment
        { $$ = {...$1, ...$2} }

    | return_statement
        { $$ = $1 }

    | CONTINUE
        { $$ = { type: 'continue' } }

    | BREAK
        { $$ = { type: 'break' } }
    ;

in_expression
    : expression
        { $$ = $1 }

    | '[' expression_list ']'
        { $$ = $2 }
    ;

codeblock_closed
    : FOR '(' for_init CS expression CS variable_assignment_list ')' non_delimited_statement
        { $$ = { type: 'for', init: $3, condition: $5, increment: $7.statements, statements: $9 } }

    | FOR '(' for_init IN in_expression ')' non_delimited_statement
        { $$ = { type: 'for_in', init: $3, list: $5, statements: $7 } }

    | WHILE '(' expression ')' non_delimited_statement
        { $$ = { type: 'while', condition: $3, statements: $5 } }

    | DO non_delimited_statement WHILE '(' expression ')'
        { $$ = { type: 'do', condition: $5, statements: $2 } }

    | DO statement_no_closed WHILE '(' expression ')'
        { $$ = { type: 'do', condition: $5, statements: $2 } }

    | ONCE defined_scopes non_delimited_statement
        { $$ = { ...$2, type: 'once', statements: $3 } }

    | SWITCH '(' expression ')' case_body
        { $$ = { type: 'switch', value: $3, cases: $5.cases } }

    | IF '(' expression ')' non_delimited_statement %prec IF_NO_ELSE
        { $$ = {type:'if', conditions: [{type: 'if', expression: $3, statements: $5 }] } }

    | IF '(' expression ')' non_delimited_statement ELSE non_delimited_statement
        { $$ = { type:'if', conditions: [{type: 'if', expression: $3, statements: $5 }, {type: 'else', statements: $7}]} }

    | DEBUGGER
        { $$ = { type: 'debugger' }}
    
    | PRAGMA
        { $$ = { type: 'pragma', value: $1 }}

    ;

case_body
    : '{' case_list '}'
        { $$ = $2 }

    | '{' case_list DEFAULT ':' statement_list '}'
        { $$ = $2; $$.cases.push({ default: true, statements: implicit_scope($5) }) }
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
        { $$ = $1; $$.cases.push({condition: $3, statements: implicit_scope($5.statements) }) }

    | CASE case_value ':' statement_list_closed
        { $$ = {cases: [{ condition: $2, statements: implicit_scope($4.statements) }]} }
    ;

for_assignation
    : variable_assignment
        { $$ = $1 }

    | INC name_id
        { $$ = { ...$2, type: 'variable_increment', pre: 1n, post: 0n } }

    | DEC name_id
        { $$ = { ...$2, type: 'variable_increment', pre: -1n, post: 0n } }

    | name_id INC
        { $$ = { ...$1, type: 'variable_increment', pre: 0n, post: 1n } }

    | name_id DEC
        { $$ = { ...$1, type: 'variable_increment', pre: 0n, post: -1n } }
    ;

for_init
    : variable_declaration
        { $$ = $1; }

    | variable_assignment
        { $$ = $1 }

    | name_id
        { $$ = $1 }

    | col_declaration
        { $$ = $1 }
    ;

variable_declaration
    : variable_type_declaration
        { $$ = {...$1, const: false} }

    | CONST variable_type_declaration
        { $$ = {...$2, const: true } }
    ;

variable_type_declaration
    : INT variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'int', items: $2.items } }

    | FE variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'fe', items: $2.items } }

    | EXPR variable_declaration_list
        { $$ = { type: 'variable_declaration', vtype: 'expr', items: $2.items } }

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

    | T_STRING variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'string', items: [$2], init: [$4] } }

    | FUNCTION variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'function', items: [$2], init: [$4] } }

    | CONTAINER variable_declaration_item '=' expression
        { $$ = { type: 'variable_declaration', vtype: 'container', items: [$2], init: [$4] } }

    | INT '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'int', items: $3.items, init: $7 } }

    | FE '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'fe', items: $3.items, init: $7 } }

    | EXPR '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'expr', items: $3.items, init: $7 } }

    | T_STRING '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'string', items: $3.items, init: $7 } }

    | CONTAINER '[' variable_declaration_list ']' '=' '[' expression_list ']'
        { $$ = { type: 'variable_declaration', vtype: 'container', items: $3.items, init: $7 } }
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
    : name_reference %prec NO_STAGE
        { $$ = $1 }

    | name_reference variable_declaration_array
        { $$ = { ...$1, ...$2 } }
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
    : left_variable_multiple_assignment_list ',' name_id
        { $$ = $1; $$.names.push($1) }

    | left_variable_multiple_assignment_list ','
        { $$ = $1; $$.names.push({ type: 'ignore' }) }

    | name_id
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
    : name_id assign_operation expression %prec EMPTY
        { $$ = { type: 'assign', assign: $2.type, name: $1, value: $3 } }

    | name_id '=' sequence_definition
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
        { $$ = { stage: $3 } }

    | %prec NO_STAGE
        { $$ = { stage: DEFAULT_STAGE } }
    ;

flexible_string
    : STRING
        { $$ = { type: 'string', value: $1 } }

    | TEMPLATE_STRING
        { $$ = { type: 'string', template: true, value: $1 } }
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
        { $$ = {type: 'range_seq', from: $1, to: $3, times: $5} }

    | expression ':' expression DOTS_RANGE expression %prec EMPTY
        { $$ = {type: 'range_seq', from: $1, to: $5, times: $3}}

    | expression ':' expression DOTS_RANGE expression ':' expression %prec DOTS_REPEAT
        { $$ = {type: 'range_seq', from: $1, to: $5, times: $3, toTimes: $7}} }

    | sequence DOTS_FILL
        { $$ = {type: 'padding_seq', value: $1} }

    | '[' sequence_list ']'
        { $$ = {type: 'seq_list', values:  [$2]} }

    | expression %prec EMPTY
        { $$ = $1 }
    ;

multiple_expression_list
    : %empty    %prec EMPTY
        { $$ = ExpressionFactory.fromObject({ type: 'expression_list', values: [], __debug: 0 }); }

    | multiple_expression_list ',' expression %prec ','
        { $$ = $1; $$.pushItem(ExpressionFactory.fromObject($3)); }

    | multiple_expression_list ',' '[' expression_list ']' %prec ','
        { $$ = $1; $$.pushItem(ExpressionFactory.fromObject($4)); }
//        { $$ = $1; $$.pushItem(ExpressionFactory.fromObject({ type: 'expression_list', values: $4.values, __debug: 1 })); }

    | '[' expression_list ']' %prec NO_EMPTY
        { $$ = ExpressionFactory.fromObject({ type: 'expression_list', values:
                    [ExpressionFactory.fromObject($2)], __debug: 4}); }
//                    [ExpressionFactory.fromObject({ type: 'expression_list', values: [$2.values], __debug: 2})], __debug: 4}); console.log('A',$$) }

    | expression
        { $$ = ExpressionFactory.fromObject({ type: 'expression_list', values: [$1], __debug: 3 }); }
    ;

expression_list
    : expression_list ',' DOTS_FILL expression %prec ','
//        { $$ = $1; $$.values.push({ type: 'append', value: $4 }) }
        { $$ = $1; $$.values.push($4.insert('spread')) }

    | expression_list ',' expression %prec ','
        { $$ = $1; $$.values.push($3) }

    | DOTS_FILL expression
//        { $$ = { type: 'expression_list',  values: [{ type: 'append', value: $2}] } }
        { $$ = { type: 'expression_list',  values: [$2.insert('spread')] } }

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

    | AIR '.' IDENTIFIER
        { $$ = { name: 'air.'+$3 } }

    | AIR '.' TEMPLATE_STRING
        { $$ = { name: 'air.'+$3, template: true } }
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
    : COL stage_definition col_declaration_list
        { $$ = { type: 'col_declaration', items: $3.items, stage: $2.stage }; }

    | COL stage_definition col_declaration_ident '=' expression  // (1)
        { $$ = { type: 'col_declaration', items: [$3], stage: $2.stage, init: $5 } }

    | COL WITNESS stage_definition col_declaration_list
        { $$ = { type: 'witness_col_declaration', items: $4.items, stage: $3.stage } }

    | COL FIXED stage_definition col_declaration_list
        { $$ = { type: 'fixed_col_declaration', items: $4.items, stage: $3.stage } }

    | COL FIXED stage_definition col_declaration_ident '=' expression  // (1)
        { $$ = { type: 'fixed_col_declaration', items: [$4], stage: $3.stage, init: $6 } }

    | COL FIXED stage_definition col_declaration_ident '=' sequence_definition  // (1)
        { $$ = { type: 'fixed_col_declaration',  items: [$4], stage: $3.stage, sequence: $6 } }
    ;

challenge_declaration
    : CHALLENGE stage_definition col_declaration_list
        { $$ = { type: 'challenge_declaration', items: $3.items, stage: $2.stage } }
    ;

public_declaration
    : PUBLIC col_declaration_ident '=' expression
        { $$ = { type: 'public_declaration', items: [$2], init: $4 } }

    | PUBLIC col_declaration_list
        { $$ = { type: 'public_declaration', items: $2.items } }
    ;

public_table_declaration
    : PUBLIC_TABLE AGGREGATE '(' IDENTIFIER ',' IDENTIFIER ',' expression_list ')' IDENTIFIER '[' expression ']' '[' expression ']'
        { $$ = { type: 'public_table_declaration', aggregateType: $4, aggregateFunction: $6, name: $10, args: $8, cols: $12, rows: $15} }

    | PUBLIC_TABLE AGGREGATE '(' IDENTIFIER ',' IDENTIFIER ')' IDENTIFIER '[' expression ']' '[' expression ']'
        { $$ = { type: 'public_table_declaration', aggregateType: $4, aggregateFunction: $6, name: $8, args: [], cols: $10, rows: $13} }
    ;

proof_value_declaration
    : PROOF_VALUE col_declaration_list
        { $$ = { type: 'proof_value_declaration', items: $2.items } }
    ;

subproof_value_declaration
    : SUBPROOF_VALUE AGGREGATE '(' IDENTIFIER ')' col_declaration_list
        { $$ = { type: 'subproof_value_declaration', aggregateType: $4, items: $6.items } }
    ;


subproof_definition
    : SUBPROOF AGGREGATE IDENTIFIER '(' expression_list ')'  '{' statement_block '}'
        { $$ = { type: 'subproof_definition', aggregate: true, name: $3, rows: $5, statements: $8.statements } }

    | SUBPROOF IDENTIFIER '(' expression_list ')'  '{' statement_block '}'
        { $$ = { type: 'subproof_definition', aggregate: false, name: $2, rows: $4, statements: $7.statements } }

    | SUBPROOF IDENTIFIER '{' statement_block '}'
        { $$ = { type: 'subproof_block', aggregate: false, name: $2, statements: $4.statements } }
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
        { $$ = $1.insert('eq', ExpressionFactory.fromObject($3)) }

    | expression NE expression
        { $$ = $1.insert('ne', ExpressionFactory.fromObject($3)) }

    | expression LT expression
        { $$ = $1.insert('lt', ExpressionFactory.fromObject($3)) }

    | expression GT expression
        { $$ = $1.insert('gt', ExpressionFactory.fromObject($3)) }

    | expression LE expression
        { $$ = $1.insert('le', ExpressionFactory.fromObject($3)) }

    | expression GE expression
        { $$ = $1.insert('ge', ExpressionFactory.fromObject($3)) }

    | expression IN expression %prec IN
        { $$ = $1.insert('in', ExpressionFactory.fromObject($3)) }

    | expression IS return_type %prec IS
        { $$ = $1.insert('is', ExpressionFactory.fromObject({type: 'istype', vtype: $3.type, dim: $3.dim})); }

    | expression AND expression %prec AND
        { $$ = $1.insert('and', ExpressionFactory.fromObject($3)) }

    | expression '?' expression ':' expression %prec '?'
        { $$ = $1.insert('if', [ExpressionFactory.fromObject($3), ExpressionFactory.fromObject($5)]) }
//        { $$ = $1.insert('if', ExpressionFactory.fromObjects($3, $5)) }

    | expression B_AND expression %prec AND
        { $$ = $1.insert('band', ExpressionFactory.fromObject($3)) }

    | expression B_OR expression %prec AND
        { $$ = $1.insert('bor', ExpressionFactory.fromObject($3)) }

    | expression B_XOR expression %prec AND
        { $$ = $1.insert('bxor', ExpressionFactory.fromObject($3)) }

    | expression OR expression %prec OR
        { $$ = $1.insert('or', ExpressionFactory.fromObject($3)) }

    | expression SHL expression %prec AND
        { $$ = $1.insert('shl', ExpressionFactory.fromObject($3)) }

    | expression SHR expression %prec OR
        { $$ = $1.insert('shr', ExpressionFactory.fromObject($3)) }

    | '!' expression %prec '!'
        { $$ = $2.insert('not') })

    | expression '+' expression %prec '+'
        { $$ = $1.insert('add', ExpressionFactory.fromObject($3)) }

    | expression '-' expression %prec '-'
        { $$ = $1.insert('sub', ExpressionFactory.fromObject($3)) }

    | expression '*' expression %prec '*'
        { $$ = $1.insert('mul', ExpressionFactory.fromObject($3)) }

    | expression '%' expression %prec '%'
        { $$ = $1.insert('mod', ExpressionFactory.fromObject($3)) }

    | expression '/' expression %prec '/'
        { $$ = $1.insert('div', ExpressionFactory.fromObject($3)) }

    | expression '\\' expression %prec '\\'
        { $$ = $1.insert('intdiv', ExpressionFactory.fromObject($3)) }

    | expression POW expression %prec POW
        { $$ = $1.insert('pow', ExpressionFactory.fromObject($3)) }

    | '+' expression %prec UPLUS
        { $$ = $2 }

    | '-' expression %prec UMINUS
        { $$ = $2.insert('neg') }

    | name_id
        { $$ = ExpressionFactory.fromObject({ type: 'reference', ...$1 }) }

    | INC name_id
        { $$ = ExpressionFactory.fromObject({ type: 'reference', ...$2, inc: 'pre'}) }

    | DEC name_id
        { $$ = ExpressionFactory.fromObject({ type: 'reference', ...$2, dec: 'pre'}) }

    | name_id INC %prec INC_LEFT
        { $$ = ExpressionFactory.fromObject({ type: 'reference', ...$1, inc: 'post'}) }

    | name_id DEC %prec DEC_LEFT
        { $$ = ExpressionFactory.fromObject({ type: 'reference', ...$1, dec: 'post'}) }

    | NUMBER %prec EMPTY
        { $$ = ExpressionFactory.fromObject({ type: 'number', value: BigInt($1)}) }

    | flexible_string %prec EMPTY
        { $$ = ExpressionFactory.fromObject({...$1, type: 'string'}) }

    | '(' expression ')'
        { $$ = $2 }

    | function_call
        { $$ = ExpressionFactory.fromObject({...$1}) }

    | POSITIONAL_PARAM
        { $$ = ExpressionFactory.fromObject({position: $1, type: 'positional_param'}) }

    | casting
        { $$ = ExpressionFactory.fromObject({...$1}) }
    ;


// TODO: review real casting cases

casting
    : INT '(' expression ')'
        { $$ = { type: 'cast', cast: 'int', value: $3} }

    | FE '(' expression ')'
        { $$ = { type: 'cast', cast: 'fe', value: $3 } }

    | EXPR '(' expression ')'
        { $$ = { type: 'cast', cast: 'expr', value: $3 } }

    | COL '(' expression ')'
        { $$ = { type: 'cast', cast: 'col', value: $3 } }

    | T_STRING '(' expression ')'
        { $$ = { type: 'cast', cast: 'string', value: $3 } }

    | INT type_array '(' expression ')'
        { $$ = { ...$2, type: 'cast', cast: 'int', value: $4 } }

    | FE type_array '(' expression ')'
        { $$ = { ...$2, type: 'cast', cast: 'fe', value: $4 } }

    | EXPR type_array '(' expression ')'
        { $$ = { ...$2, type: 'cast', cast: 'expr', value: $4 } }

    | COL type_array '(' expression ')'
        { $$ = { ...$2, type: 'cast', cast: 'col', value: $4 } }

    | T_STRING type_array '(' expression ')'
        { $$ = { ...$2, type: 'cast', cast: 'string', value: $4 } }
    ;

name_id
    : name_optional_index "'" %prec NEXT
        { $$ = { ...$1, rowOffset: ExpressionFactory.fromObject({type: 'row_offset', value: 1, current: $1 }) } }

    | name_optional_index "'" NUMBER
        { $$ = { ...$1, rowOffset: ExpressionFactory.fromObject({type: 'row_offset', value: Number($3), current: $1 }) } }

    | name_optional_index "'" '(' expression ')'
        { $$ = { ...$1, rowOffset: ExpressionFactory.fromObject({type: 'row_offset', value: $4, current: $1 }) } }

    | name_optional_index "'" POSITIONAL_PARAM
        { $$ = { ...$1, rowOffset: ExpressionFactory.fromObject({type: 'row_offset', current: $1,
                                        value: ExpressionFactory.fromObject({position: $3, type: 'positional_param'})}) } }

    | "'" name_optional_index %prec LOWER_PREC
        { $$ = { ...$2, rowOffset: ExpressionFactory.fromObject({type: 'row_offset', value: 1, prior: true, current: $2 }) } }

    | NUMBER "'" name_optional_index
        { $$ = { ...$3, rowOffset: ExpressionFactory.fromObject({type: 'row_offset', value: Number($1), prior: true, current: $3 }) } }

    | '(' expression ')' "'" name_optional_index
        { $$ = { ...$5, rowOffset: ExpressionFactory.fromObject({type: 'row_offset', value: $2, prior: true, current: $5 }) } }

    | POSITIONAL_PARAM "'" name_optional_index
        { $$ = { ...$3, rowOffset: ExpressionFactory.fromObject({type: 'row_offset', current: $3, prior: true,
                                        value: ExpressionFactory.fromObject({position: $1, type: 'positional_param'})}) } }

    | name_optional_index %prec EMPTY
        { $$ = $1 }
    ;

name_optional_index
    : name_reference %prec EMPTY
        { $$ = { ...$1, dim: 0 } }

    | name_reference array_index %prec EMPTY
        { $$ = { ...$1, ...$2 } }
    ;

expression_index
    :   expression
        { $$ = $1 }

    |   expression DOTS_RANGE expression
        { $$ = ExpressionFactory.fromObject({type: 'range_index', from: $1, to: $3}); }

    |   expression DOTS_RANGE
        { $$ = ExpressionFactory.fromObject({type: 'range_index', from: $1}); }

    |   DOTS_RANGE expression
        { $$ = ExpressionFactory.fromObject({type: 'range_index', to: $2}); }
    ;

array_index
    :   array_index '[' expression_index ']'
        { $$ = { dim: $1.dim + 1, indexes: [...$1.indexes, $3] } }

    |   '[' expression_index ']'
        { $$ = { dim: 1, indexes: [$2]} }
    ;


name_reference
    : AIR '.' name_reference_right
        { $$ = { name: 'air.' + $3.name } }

    | SUBPROOF '.' name_reference_right
        { $$ = { name: 'subproof.' + $3.name } }

    | PROOF '.' name_reference_right
        { $$ = { name: 'proof.' + $3.name } }

    | IDENTIFIER
        { $$ = { name: $1 } }

    | IDENTIFIER '.' name_reference_right
        { $$ = { name: $1 + '.' + $3.name } }

    | REFERENCE
        { $$ = { name: $1 } }

    | REFERENCE '.' name_reference_right
        { $$ = { name: $1 + '.' + $3.name } }
    ;

name_reference_right
    : name_reference_right '.' IDENTIFIER
        { $$ = { name: $1.name + '.' + $3 } }

    | name_reference_right '.' TEMPLATE_STRING
        { $$ = { name: $1.name + '.' + $3 } }

    | IDENTIFIER
        { $$ = { name: $1 } }

    | TEMPLATE_STRING
        { $$ = { name: $1 } }
    ;
