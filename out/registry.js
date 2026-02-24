"use strict";
const { KEYWORD_DICONTARY } = require("./data/keywords");

class SymbolRegistry {
    constructor() {
        this.clear();
    }

    clear() {
        this.labels = [];
        this.labelsEE = [];
        this.vars = [];
        this.macros = [];
        this.structs = [];
        this.procs = [];
        this.structureInfo = [];
        this.includedFiles = [];
    }

    findVariable(name) { return this.vars.find(v => v.name === name); }
    findProcedure(name) { return this.procs.find(p => p.name === name); }
    findMacro(name) { return this.macros.find(m => m.name === name); }
    findLabel(name) { return this.labelsEE.find(l => l.name === name); }
    getKeyword(word) { return KEYWORD_DICONTARY.find(k => k.name === word); }
}

module.exports = { SymbolRegistry };