// import {Expressions} from './expressions.js';

const path = require("path");
const fs = require("fs");
const pil_parser = require("../build/pil_parser.js");
const { check } = require("yargs");
const Scalar = require("ffjavascript").Scalar;
const Expressions = require("./expressions.js");
const Definitions = require("./definitions.js");
const References = require("./references.js");
const Indexable = require("./indexable.js");
const Ids = require("./ids.js");
const Constraints = require("./constraints.js");
const Processor = require("./processor.js");
const Context = require("./context.js");
const { mainModule } = require("process");


const oldParseError = pil_parser.Parser.prototype.parseError;

class SkipNamespace extends Error {
    constructor(namespace, name = false) {
        super(name ? `Pol ${namespace}.${name} must be skipped` : `Namespace ${namespace} must be skipped`);
        this.namespace = namespace;
        this.name = name;
    }
}

class Compiler {

    constructor(Fr) {
        this.Fr = Fr;
        this.constants = new Definitions(Fr);
    }

    initContext() {
        this.namespace = "Global";
        this.includedFiles = {};
        this.namespaces = true;
        this.skippedNamespaces = {};
        this.skippedPols = {};
        this.includePaths = (this.config && this.config.includePaths) ? (Array.isArray(this.config.includePaths) ? this.config.includePaths: [this.config.includePaths]): [];
        this.relativeFileName = '';
    }
    compile(fileName, config = {}) {
        const isMain = true;
        this.config = {...config};
        this.initContext();
        this.processor = new Processor(this.Fr, this, this.config);
        if (this.config.namespaces) {
            this.namespaces = {};
            for (const name of this.config.namespaces) {
                this.namespaces[name] = 0;
            }
        }
        if (this.config.defines && typeof this.config.defines === 'object') {
            for (const name in this.config.defines) {
                this.constants.define(name, this.Fr.e(this.config.defines[name]));
            }
        }
        let sts = this.parseSource(fileName, true);
        this.processor.startExecution(sts);
        if (config.processorTest) {
            return this.processor;
        }
//        console.log(res);
/*
        console.log('\x1b[1;35m==== CONSTANTS ====');
        this.constants.dump();
        console.log('\x1b[0m');
        this.checkNotFoundNamespaces();
        this.checkUndefinedPols();
        this.simplifyAll();
        // this.checkUnusedExpressions();
        this.checkExpressionsDegree();
        this.reduceExpressions();
        return this.contextToJson();*/
    }
    instanceParser(src, fullFileName) {
        this.srcLines = src.split(/(?:\r\n|\n|\r)/);

        const myErr = function (str, hash) {
            str = fullFileName + " -> " + str;
            oldParseError(str, hash);
        };
        pil_parser.Parser.prototype.parseError = myErr;
        let parser = new pil_parser.Parser();
        const parserPerformAction = parser.performAction;
        const parserStateInfo = parser.productions_;
        let compiler = this;

        parser.performAction = function (yytext, yyleng, yylineno, yy, yystate, $$, _$ ) {
            const result = parserPerformAction.apply(this, arguments);
            const first = _$[$$.length - 1 - parserStateInfo[yystate][1]];
            const last = _$[$$.length - 1];
            const sourceRef = `${compiler.relativeFileName}:${last.last_line}`;
            Context.processor.sourceRef = sourceRef;
            if (typeof this.$ !== 'object')  {
                return result;
            }

            this.$.debug = `${compiler.relativeFileName}:${last.last_line}:${first.first_column}:${last.last_line}:${last.last_column}`;
            // this.$.__debug = `${compiler.relativeFileName} (${first.first_line}, ${first.first_column}) (${last.last_line}, ${last.last_column})`;
            // this.$.__contents = compiler.srcLines[first.first_line - 1].substring(first.first_column + 1, last.last_column);
            this.$.__yystate = `${yystate} ${yylineno}`
            return result;
        }
        return parser;
    }
    parseSource(fileName, isMain = false, options = {}) {

        let libraries = [];
        if (isMain && this.config.includes) {
            this.fileDir = process.cwd();
            for (const include of this.config.includes) {
                libraries.push({type: 'include', file: include, debug:'', contents: this.loadInclude({file: include})});
            }   
        }
        const [_src, fileDir, fullFileName, relativeFileName] = this.loadSource(fileName, isMain. options);

        const preSrc = options.preSrc ?? '';
        const postSrc = options.postSrc ?? '';
        const src = preSrc + _src + postSrc;
        this.relativeFileName = relativeFileName;
        this.fileDir = fileDir;

    
        const parser = this.instanceParser(src, fullFileName);
        let sts;
        try {
            sts = parser.parse(src);
            for (let i=0; i<sts.length; i++) {
                if (sts[i].type !== 'include') continue;
                sts[i].contents = this.loadInclude(sts[i]);
            }
            for (const library of libraries.reverse()) {
                sts.unshift(library);
            }   
        } catch (e) {
            console.log('ERROR ON '+Context.processor.sourceRef);
            throw e;
        }
        return sts;
    }
    parseExpression(expression) {
        const parser = this.instanceParser(expression, "template expression");
        return parser.parse(expression);
    }
    loadInclude(s, options = {}) {

        const includeFile = this.asString(s.file);
        const fullFileNameI = this.config.includePaths ? s.file : path.resolve(this.fileDir, includeFile);
        if (this.includedFiles[fullFileNameI]) {
            return false;
        }
        this.includedFiles[fullFileNameI] = true;
        const previous = [this.cwd, this.relativeFileName, this.fileDir];

        this.cwd = this.fileDir;
        const sts = this.parseSource(fullFileNameI, false, options);

        [this.cwd, this.relativeFileName, this.fileDir] = previous;
        return sts;
    }
    loadSource(fileName, isMain) {
        let fullFileName, fileDir, src;
        let relativeFileName = '';
        let includePathIndex = 0;
        if (isMain && this.config.compileFromString) {
            relativeFileName = fullFileName = "(string)";
            fileDir = '';
            src = fileName;
        }
        else {
            let includePaths = [...this.includePaths];
            let directIncludePathIndex;
            const cwd = this.cwd ? this.cwd : process.cwd();

            if (this.config.includePathFirst) {
                directIncludePathIndex = includePaths.length;
                includePaths.push(cwd);
            }
            else {
                directIncludePathIndex = 0;
                includePaths.unshift(cwd);
            }
            do {
                fullFileName = path.resolve(includePaths[includePathIndex], fileName);
                if (fs.existsSync(fullFileName)) break;
                ++includePathIndex;
            } while (includePathIndex < includePaths.length);

            fileDir = path.dirname(fullFileName);

            if (includePathIndex != directIncludePathIndex) {
                relativeFileName = fileName;
            }
            else {
                if (isMain) {
                    relativeFileName = path.basename(fullFileName);
                    this.basePath = fileDir;
                } else {
                    if (fullFileName.startsWith(this.basePath)) {
                        relativeFileName = fullFileName.substring(this.basePath.length+1);
                    } else {
                        relativeFileName = fullFileName;
                    }
                }
            }
            // console.log(`LOADING FILE ${fullFileName} .............`)
            src = fs.readFileSync(fullFileName, "utf8") + "\n";
            // console.log('END LOADING ...');
        }
        return [src, fileDir, fullFileName, relativeFileName];
    }
    asString(s) {
        if (typeof s === 'string') return s;
        if (typeof s.type === 'string') {
            return s.value;
        }
        this.error(s, "invalid string");
    }
}

module.exports = function compile(Fr, fileName, ctx, config = {}) {

    let compiler = new Compiler(Fr);
    return compiler.compile(fileName, config);
}
