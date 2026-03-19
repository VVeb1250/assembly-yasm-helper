"use strict";

const { KEYWORD_MAP } = require("./data/keywords");

class SymbolRegistry {

    constructor() {
        this.clear();
    }

    clear() {

        // arrays (สำหรับ iterate)
        this.vars = [];
        this.procs = [];
        this.macros = [];
        this.labels = [];
        this.labelsEE = [];
        this.structs = [];

        this.structureInfo = [];
        this.includedFiles = [];

        // fast lookup maps
        this.varMap = new Map();
        this.procMap = new Map();
        this.macroMap = new Map();
        this.labelMap = new Map();

        // duplicate guard
        this.varSet = new Set();
        this.procSet = new Set();
        this.macroSet = new Set();
        this.labelSet = new Set();

        // section index
        this.sectionIndex = new Map();
    }

    // --------------------------------
    // SECTION INDEX
    // --------------------------------

    addToSection(section, symbol) {

        if (!section) return;

        const key = section.toLowerCase();

        if (!this.sectionIndex.has(key)) {
            this.sectionIndex.set(key, []);
        }

        this.sectionIndex.get(key).push(symbol);
    }

    getSectionSymbols(section) {
        return this.sectionIndex.get(section.toLowerCase()) || [];
    }

    // --------------------------------
    // VARIABLES
    // --------------------------------

    addVariable(v) {

        const key = v.name.toLowerCase();

        if (this.varSet.has(key)) return;

        this.varSet.add(key);

        this.vars.push(v);
        this.varMap.set(key, v);

        this.addToSection(v.section, v);
    }

    findVariable(name) {
        return this.varMap.get(name.toLowerCase());
    }

    // --------------------------------
    // PROCEDURES
    // --------------------------------

    addProcedure(p) {

        const key = p.name.toLowerCase();

        if (this.procSet.has(key)) return;

        this.procSet.add(key);

        this.procs.push(p);
        this.procMap.set(key, p);

        this.addToSection(p.section, p);
    }

    findProcedure(name) {
        return this.procMap.get(name.toLowerCase());
    }

    // --------------------------------
    // MACROS
    // --------------------------------

    addMacro(name) {

        const key = name.toLowerCase();

        if (this.macroSet.has(key)) return;

        this.macroSet.add(key);

        this.macros.push(name);
        this.macroMap.set(key, name);
    }

    findMacro(name) {
        return this.macroMap.get(name.toLowerCase());
    }

    // --------------------------------
    // LABELS
    // --------------------------------

    addLabel(name, line) {

        const key = name.toLowerCase();

        if (this.labelSet.has(key)) return;

        this.labelSet.add(key);

        const sym = { name, line };
        this.labels.push(sym);
        this.labelMap.set(key, sym);
    }

    findLabel(name) {

        const key = name.toLowerCase();

        if (this.labelMap.has(key)) {
            return this.labelMap.get(key);
        }

        return this.labelsEE.find(
            l => l.name.toLowerCase() === key
        );
    }

    // --------------------------------
    // KEYWORDS
    // --------------------------------

    getKeyword(word) {
        if (!word) return undefined;
        return KEYWORD_MAP.get(word.toLowerCase());
    }

}

module.exports = { SymbolRegistry };