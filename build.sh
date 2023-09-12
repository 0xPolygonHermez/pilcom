mkdir -p build; ./node_modules/.bin/jison src/pil_parser.jison --debug -o build/pil_parser.js |
    tee tmp/states.txt
grep "\->" tmp/states.txt |
    sed 's/ ->.*//' |
    sort | grep -v "^transitions" |
    uniq > /tmp/A
grep -B 400 "^Item sets" tmp/states.txt | grep -v "^transitions " |
    grep ".*([0-9]*)" |
    sed 's/\(^.*\)([0-9]*).*/\1/' |
    sort > /tmp/B
echo -e "\e[31m"
diff --side-by-side /tmp/A /tmp/B | grep "[<|>]" |
    sed "s#\([^ ]*\) *[|][ \t]*\([^ ]*\)#< \1\n> \2#g" | sed 's#[ \t]*[><][ \t]*##g' |
    grep -vE '(\\\\|\!|\%|\(|\)|\*|\*\=|\+|\+\=|\,|\-|\-\=|\.|\/|\:|\:\:|\=|\=\=\=|\?|\[|\]|\{|\}|\$end|AND|POSITIONAL_PARAM|B_AND|BREAK|B_XOR|CASE|CHALLENGE|COL|CONST|CONTINUE|CS|DEC|DO|DOTS_ARITH_SEQ|DOTS_FILL|DOTS_GEOM_SEQ|DOTS_RANGE|ELSE|EOF|EQ|error|EXPR|FE|FIXED|FOR|FUNCTION|GE|GLOBAL|GT|IDENTIFIER|IF|IN|INC|INCLUDE|INTEGER|IS|LE|LT|METADATA|CONTAINER|NE|NUMBER|OR|POW|PUBLIC|REFERENCE|RETURN|SHL|SHR|STAGE|SWITCH|STRING|TEMPLATE_STRING|T_STRING|WHEN|WHILE|WITNESS|LAST|FIRST|FRAME|ONCE|PROOF|SUBPROOF|SUBPROOF_VALUE|PROOF_VALUE|ALIAS|PRIVATE|ON|AGGREGATE|AIR|USE)' | grep -v "'"
echo -e "\e[0m"


