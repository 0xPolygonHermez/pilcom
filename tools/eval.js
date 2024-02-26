const vm = require('vm');

class C {
    runme() {
        let a = 10;
        let values = [];
        console.log('Hi');
        const context = {values}
        vm.createContext(context);
        console.log(vm.runInContext('values.push(63)', context));
        console.log(values);
    }
}

let c = new C();
c.runme();