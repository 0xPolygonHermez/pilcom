module.exports = class Transpiler {
    constructor(config = {}) {
        this.processor = config.processor;
        this.config = config;
    }
    transpile(st) {
        console.log(st);
        this.declared = {};
        const code = this.#transpile(st);
        console.log(code);
        EXIT_HERE;
        return code;
    }
    #transpile(st) {
        console.log(st);
        switch(st.type) {
            case 'for': return this.#transpileFor(st);
            case 'code': return this.#transpile(st.statements);
            case 'variable_declaration': return this.#transpileVariableDeclaration(st);
            case 'variable_increment': return this.#transpileVariableIncrement(st);
            case 'scope_definition': return this.#transpileScopeDefinition(st);
            case 'expr': return this.#transpileExpr(st);
            case 'switch': return this.#transpileSwitchCase(st);
            case 'assign': return this.#transpileAssign(st);
            case 'if': return this.#transpileIf(st);
        }
        throw new Error(`not known how transpile ${st.type}`);
    }
    #transpileIf(st) {
        let code = '';        
        let first = true;
        for (const cond of st.conditions) {
            if (cond.type === 'if') {
                if (first) code += 'if (';
                else code += 'else if (';
                code += cond.expression.toString() + ')';            
            } else if (cond.type === 'else') {
                code += ' else ';
            } else {
                EXIT_HERE;
            }
            code += this.#transpile(cond.statements);            
            first = false;
        }   
        return code;
    }
    #transpileSwitchCase(st) {
        let code = 'switch ('+st.value.toString()+') {\n';
        let ccases = [];
        console.log(st);
        for (const _case of st.cases) {
            if (_case.condition.values) {
                let cvalues = [];            
                for (const cvalue of _case.condition.values) {
                    cvalues.push(cvalue.toString());
                }
                code += '\n\tcase '+cvalues.join()+':\n';
            } else if (_case.default) {
                code += '\n\tdefault:\n';
            } else {
                console.log(_case);
                EXIT_HERE;
            }
            code += this.#transpile(_case.statements)+';\nbreak;\n';
        }   
        code += '}\n';
        return code;
    }
    #transpileExpr(st) {
        return st.expr.toString();
    }
    #transpileFor(st) {
        let code = '{';
        const inits = Array.isArray(st.init) ? st.init : [st.init];
        const cinits = [];
        for (const init of inits) {
            cinits.push(this.#transpile(init));
        }
        const cincrements = [];
        for (const increment of st.increment) {
            cincrements.push(this.#transpile(increment));
        }
        code += 'for ('+cinits.join()+';'+st.condition.toString()+';'+cincrements.join()+') {\n';
        code += this.#transpile(st.statements) + '\n}';
        return code;
    }
    #transpileVariableDeclaration(st) {
        let code = '';
        if (st.vtype !== 'string' && st.vtype !== 'int') {
            throw new Error(`declaration type ${st.vtype} not supported on transpilation`);
        }
        console.log(st.items);
        console.log(st.init);
        code += st.const ? 'const ':'let ';
        if (st.init) {
            const initlen = st.init.type === 'expression_list' ? st.init.values.length : st.init.length;
            if (st.items.length !== initlen) {
                throw new Error(`mistmatch lengths ${st.items.length} vs ${initlen}`);            
            }
        }
        if (st.items.length === 1) {
            code += st.items[0].name;
        } else {
            code += '[' + st.items.map(x => x.name).join() + ']';
        }
        if (st.init) {
            if (st.init.length === 1) {
                code += `=${st.init[0].toString()}`;
            } else if (st.init.type === 'expression_list') {
                const inits = [];
                for (const init of st.init.values) {
                    inits.push(init.toString());
                }
                code += '=['+inits.join()+']';
            } else {
                EXIT_HERE;
            }
        }
        return code;
    }
    f()
    {for (let i=0;i < N;++i) {
    {let [a,b,cin,plast,c,cout,op]=[A*[i],B*[i],CIN*[i],LAST*[i],0,0,OP*[i]];
    println(i);
    switch (op) {

        case 0:
    {c=(cin + a + b) & 255;
    cout=(cin + a + b) >> 8};
    break;

        case 1:
    {cout=((a - cin) >= b)?(0):(1);
    c=((256 * cout + a) - cin) - b};
    break;

        case 2,3:{
            if (a < b){
                cout=1;
                c=plast
            } else if (a == b) {
                cout=cin;
                c=plast * cin 
            };
            if (op == 3 && plast && (a & 128) != (b & 128)){
                c=a & 128;
                cout=c
            }
            };
            break;

        case 4: {
            if (a == b && !cin) c=plast; else cout=1;
            cout=(plast)?(!cout):(cout)};
            break;

        case 5:
    {c=a & b;
    cout=cin || c};
    break;

        case 6:
    {c=a | b};
    break;

        case 7:
    {c=a ^ b};
    break;
    }
    ;
    C[i]=c;
    COUT[i]=c}
    }
    }
    #transpileReference(ref) {
        let code = ref.name;
        if (!ref.dim) {
            return code;
        }
        const cindexes = [];
        for (const index of ref.indexes) {
            cindexes.push(index.toString());
        }
        return code + '['+ cindexes.join('][')+']';
    }
    #transpileAssign(st) {
        return this.#transpileReference(st.name) + '=' + st.value.toString();
    }
    #transpileVariableIncrement(st) {
        if (!st.dim) {
            if (st.pre === 1n) {   
                return '++'+st.name;
            }
            if (st.post === 1n) {   
                return st.name+'++';
            }
        }
        throw new Error(`Traspilation not supported by pre:${st.pre}, post:${st.post}, dim:${dim}`);
    }
    #transpileScopeDefinition(st) {
        let codes = [];
        for (const statement of st.statements) {
            codes.push(this.#transpile(statement));
        }
        return '{'+codes.join(';\n')+'}';
    }
}