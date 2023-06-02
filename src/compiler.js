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
        this.processor = new Processor(Fr, this);
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
    async compile(fileName, config = {}) {
        const isMain = true;
        this.initContext();
        this.config = config;
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
        let sts = await this.parseSource(fileName, true);
        this.processor.startExecution(sts);
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
        /*
        const __symbol_info__ = this.terminals_[symbol] + ( lexer.match &&
                              lexer.match != this.terminals_[symbol] ? ` (${lexer.match})`:'');
        console.log('\x1B[93mSTATE '+state+' SYMBOL '+__symbol_info__+"\x1B[0m");
        */
        parser.performAction = function (yytext, yyleng, yylineno, yy, yystate, $$, _$ ) {
            const result = parserPerformAction.apply(this, arguments);
            const first = _$[$$.length - 1 - parserStateInfo[yystate][1]];
            const last = _$[$$.length - 1];
            const sourceRef = `${compiler.relativeFileName}:${last.last_line}`;
//            if (sourceRef === 'mem_align.pil:48') {
/*            if (sourceRef === 'sequence.pil:5') {
                console.log(arguments);
                console.log(this);
                console.log(yy);
                console.log(yyleng);
                EXIT_HERE;
            }*/
            // console.log(`ST_${yystate} ${parserStateInfo[yystate][0]} ${sourceRef}`);
            if (typeof this.$ !== 'object')  {
                return result;
            }

            this.$.debug = `${compiler.relativeFileName}:${last.last_line}`;
            // this.$.__debug = `${compiler.relativeFileName} (${first.first_line}, ${first.first_column}) (${last.last_line}, ${last.last_column})`;
            // this.$.__contents = compiler.srcLines[first.first_line - 1].substring(first.first_column + 1, last.last_column);
            this.$.__yystate = `${yystate} ${yylineno}`
            return result;
        }
        return parser;
    }
    async parseSource(fileName, isMain = false) {

        const [src, fileDir, fullFileName, relativeFileName] = await this.loadSource(fileName, isMain);

        this.relativeFileName = relativeFileName;
        this.fileDir = fileDir;

        const parser = this.instanceParser(src, fullFileName);
        const sts = parser.parse(src);

        for (let i=0; i<sts.length; i++) {
            if (sts[i].type !== 'include') continue;
            sts[i].contents = await this.loadInclude(sts[i]);
        }
        return sts;
    }
    async loadInclude(s) {

        const includeFile = this.asString(s.file);
        const fullFileNameI = this.config.includePaths ? s.file : path.resolve(this.fileDir, includeFile);
        if (this.includedFiles[fullFileNameI]) {
            return false;
        }
        this.includedFiles[fullFileNameI] = true;
        const previous = [this.cwd, this.relativeFileName, this.fileDir];

        this.cwd = this.fileDir;
        const sts = await this.parseSource(fullFileNameI, false);

        [this.cwd, this.relativeFileName, this.fileDir] = previous;
        return sts;
    }
    async loadSource(fileName, isMain) {
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
            console.log(`LOADING FILE ${fullFileName} .............`)
            src = await fs.promises.readFile(fullFileName, "utf8") + "\n";
            console.log('END LOADING ...');
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

module.exports = async function compile(Fr, fileName, ctx, config = {}) {

    let compiler = new Compiler(Fr);
    return await compiler.compile(fileName, config);
}
