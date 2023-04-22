const Scope = require("./scope.js");

module.exports = class Processor {
    constructor (Fr, parent, references, expressions) {
        this.Fr = Fr;
        this.references = references;
        this.scope = new Scope(this.Fr, this.references);
        this.parent = parent;
        this.expressions = expressions;
    }
    execute(statments) {
        const lstatments = Array.isArray(statments) ? statments : [statments];
        for (const st of lstatments) {
            const result = this.executeStatment(st);
            if (result === false) return false;
            if (result === true) return true;
        }
    }
    executeStatment(st) {
        if (typeof st.type === 'undefined') {
            console.log(st);
            this.error(st, `Invalid statment (without type)`);
        }
        const method = 'exec' + st.type.charAt(0).toUpperCase() + st.type.slice(1);
        if (!(method in this)) {
            console.log('==== ERROR ====');
                this.error(st, `Invalid statment type: ${st.type}`);
        }
        return this[method](st);
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
        const fullname = this.parent.getFullName(st);
        this.scope.define(fullname, {value: st.init ? this.expressions.e2value(st.init):null});
        return;
    }
    execAssign(st) {
        let expr = {...st.name};
        expr.expression = st.value;
        this.parent.setPol(expr);
    }
    execBuildInPrintln(s) {

        const sourceRef = this.parent.fileName + ':' + s.first_line;
        let texts = [];
        for (const arg of s.arguments) {
            texts.push(typeof arg === 'string' ? arg : this.expressions.e2value(arg));
        }
        // [${sourceRef}]
        console.log(`\x1B[1;35m${texts.join(' ')}\x1B[0m`);
    }
    execIf(s) {
        for (let icond = 0; icond < s.conditions.length; ++icond) {
            const cond = s.conditions[icond];
            if ((icond === 0) !== (cond.type === 'if')) {
                throw new Exception('first position must be an if, and if only could be on first position');
            }
            if (cond.type === 'else' && icond !== (s.conditions.length-1)) {
                throw new Exception('else only could be on last position');
            }

            if (typeof cond.expression !== 'undefined' && this.expressions.e2value(cond.expression) !== true) {
                continue;
            }
            this.scope.push();
            const res = this.parent.parseStatments(cond.statments);
            console.log(res);
            this.scope.pop();
            if (typeof res === 'boolean') {
                return res;
            }
            break;
            // console.log(this.parent.getFullName(arg)+': '+this.expressions.e2num(arg));
        }
    }
    execWhile(s) {
        while (this.expressions.e2value(s.condition)) {
            this.scope.push();
            const res = this.parent.parseStatments(s.statments);
            this.scope.pop();
            if (res === false) break;
        }
    }
    execFor(s) {
        // console.log(s.init);
        this.scope.push();
        this.execute([s.init]);
        while (this.expressions.e2value(s.condition)) {
            this.scope.push();
            const res = this.parent.parseStatments(s.statments);
            this.scope.pop();
            if (res === false) break;
            // console.log(s.increment);
            this.execute(s.increment);
        }
        this.scope.pop();
        // console.log(s);
/*
        while (this.expressions.e2value(s.condition)) {
            this.scope.push();
            this.parent.parseStatments(s.statments);
            this.scope.pop();
        }*/
    }
    execBreak(s) {
        return false;
    }
    execContinue(s) {
        return true;
    }
    error(s, msg) {
        console.log(s);
        throw new Error(msg);
    }
}
