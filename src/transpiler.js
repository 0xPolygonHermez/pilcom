module.exports = class Transpiler {
    constructor(config = {}) {
        this.processor = config.processor;
        this.config = config;
    }
    transpile(st) {
        console.log(st);
        this.declared = {};
        return this.#transpile(st);
    }
    #transpile(st) {
        console.log(st);
        switch(st.type) {
            case 'for': return this.#transpileFor(st);
            case 'code': return this.#transpile(st.statements);
            case 'variable_declaration': return this.#transpileVariableDeclaration(st);
        }
    }
    #transpileFor(st) {
        let code = '{';
        console.log(st.condition.toString());
        this.#transpile(st.init);
        EXIT_HERE;
    }
    #transpileVariableDeclaration(st) {
        let code = '';
        if (st.vtype !== 'string' && st.vtype !== 'int') {
            throw new Error(`declaration type ${st.vtype} not supported on transpilation`);
        }
        console.log(st.items);
        console.log(st.init);
        code += st.const ? 'const ':'let ';
        if (st.init && st.items.length !== st.init.length) {
            throw new Error(`declaration type ${st.vtype} not supported on transpilation`);            
        }
        if (st.items.length === 1) {
            code += st.items[0].name;
        } else {
            EXIT_HERE;
        }
        if (st.init) {
            if (st.init.length === 1) {
                code += `=${st.init[0].toString()}`;
            } else {
                EXIT_HERE;
            }
        }
        console.log(code);
        return code;
    }
}