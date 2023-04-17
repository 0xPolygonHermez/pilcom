const Scope = require("./scope.js");

module.exports = class Processor {
    constructor (Fr, parent) {
        this.Fr = Fr;
        this.scope = new Scope();
        this.parent = parent;
    }
    execute(statments) {
        console.log(statments);
        const lstatments = Array.isArray(statments) ? statments : [statments];
        for (const st of lstatments) {
            console.log(st);
            this.executeStatment(st);
        }
    }
    executeStatment(st) {
        console.log(st);
        const method = 'exec' + st.type.charAt(0).toUpperCase() + st.type.slice(1);
        if (!(method in this)) {
            console.log('==== ERROR ====');
            console.log(st);
            this.error(st, `Invalid statment type: ${st.type}`);
        }
        this[method](st);
    }
    execCall(st) {
        const namespace = st.function.namespace;
        const name = st.function.name;
        if (namespace === 'this') {
            const buildInMethod = 'execBuildIn' + name.charAt(0).toUpperCase() + name.slice(1);
            if (buildInMethod in this) {
                this[buildInMethod](st);
            }
            return;
        }
        const fname = namespace + '.' + name;
        this.error(st, `Undefined function statment type: ${fname}`);
    }
    execVar(st) {
        this.scope.define(st.name, {value: st.init.value ?? null});
        return;
    }
    execAssign(st) {
        console.log('==== EXEC ASSIGN ====');
        console.log(st);
        let expr = {...st.name};
        expr.expression = st.value;
        this.parent.setPol(expr);
    }
    execBuildInPrintln(s) {
        console.log('Hello, world!!!');
    }
    error(s, msg) {
        console.log(s);
        throw new Error(msg);
    }
}
