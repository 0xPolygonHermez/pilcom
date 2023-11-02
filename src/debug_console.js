module.exports = class DebugClass {
    constructor (options = {}) {
        this.originalMethod = console.log;
        this.maxSourceRefLen = options.maxSourceRefLen ?? 20;
        console.log = (...args) => this.consoleLog.apply(this, args);
        console.stdebug = (...args) => this.stdebug.apply(this, args);
        console.stclear = (...args) => this.stclear.apply(this, args);
    }
    static init (options = {}) {
        return new DebugClass(options);
    }
    consoleLog (...args) {
        let initiator = false;
        try {
            throw new Error();
        } catch (e) {
            if (typeof e.stack === 'string') {
                let lineIndex = 2;
                for (const line of e.stack.split('\n')) {
                    const matches = line.match(/^\s+at\s+.*\/([^\/:]*:[0-9]+:[0-9]+)\)/);
                    if (!matches) continue;
                    --lineIndex;
                    if (lineIndex < 0) {
                        initiator = matches[1];
                        break;
                    }
                }
            }
        }
        if (initiator === false) {
            this.originalMethod.apply(console, args);
        } else {
            initiator = initiator.split(':').slice(0,2).join(':').replace('.js','');
            initiator = initiator.length > this.maxSourceRefLen ? ('...' + initiator.substring(-this.maxSourceRefLen+3)) : initiator.padEnd(this.maxSourceRefLen);
            this.originalMethod.apply(console, [`\x1B[30;104m${initiator} \x1B[0m`, ...args]);
        }
    }
    stdebug(...args) {
        this.consoleLog.apply(this, args);
    }
    stclear(...args) {
        this.debuglog = [];
    }
}
