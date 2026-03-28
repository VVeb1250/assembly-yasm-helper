"use strict";

const fs = require("fs");
const path = require("path");
const { AsmTokenizer } = require("./tokenizer");
const { Utils } = require("./utils");
const { Info, Procedure, Label } = require("./data/structs");

class DocumentScanner {

    constructor(registry, currentFilePath = null) {
        this.tokenizer = new AsmTokenizer();
        this.registry = registry;
        this.currentFilePath = currentFilePath;
        this.currentSection = "";

        // regex cache
        this.varRegex    = /\b(db|dw|dd|dq|dt|resb|resw|resd|resq|equ)\b/i;
        this.labelRegex  = /^\s*((?:%%)?[A-Za-z_.$?][\w.$?]*):/;
        this.procRegex   = /^\s*([A-Za-z_.$?][\w.$?]*)\s+proc\b/i;
        this.macroRegex  = /^\s*%macro\b/i;
        this.defineRegex = /^\s*%(define|assign)\b/i;
    }

    async scan(documentLines, clearPrevious = true) {
        if (clearPrevious) {
            this.registry.clear();
            if (this.currentFilePath) {
                this.registry.includedFiles.push(path.normalize(this.currentFilePath));
            }
        }
        this.currentSection = "";
        this._lines = documentLines;
        this._currentParentLabel = null;

        for (let x = 0; x < documentLines.length; x++) {
            const ctx = this._buildContext(documentLines[x]);

            if (this._detectSection(ctx))            continue;
            this._detectLabel(ctx, x);
            this._detectVariable(ctx, x, clearPrevious);
            await this._detectProcedure(ctx, x, documentLines);
            await this._detectInclude(ctx);
            this._detectMacro(ctx, x);
            this._detectDefine(ctx);
            this._detectExtern(ctx, x);
        }
    }

    // -------------------------------------------------------
    // Context builder — tokenizes each line once
    // -------------------------------------------------------

    _buildContext(line) {
        const clean = Utils.clearSpace(line);
        return {
            raw:       line,
            clean,
            lower:     clean.toLowerCase(),
            noComment: line.replace(/;.*$/, "").trim(),
            words:     this.tokenizer.tokenize(line)
        };
    }

    // -------------------------------------------------------
    // Detection methods
    // -------------------------------------------------------

    _detectSection(ctx) {
        if (!ctx.lower.startsWith("section") && !ctx.lower.startsWith("segment")) return false;
        if (ctx.words.length > 1) this.currentSection = ctx.words[1].toLowerCase();
        return true;
    }

    _detectLabel(ctx, x) {
        const match = ctx.noComment.match(this.labelRegex);
        if (match) {
            const name = match[1];
            if (name.startsWith('.')) {
                // local label — track scoped: 'parent/.local'
                const key = (this._currentParentLabel || '') + '/' + name.toLowerCase();
                this.registry.localLabelMap.set(key, { name, line: x, parent: this._currentParentLabel });
                // add to global map (first occurrence) for completion/hover
                if (!this.registry.labelSet.has(name.toLowerCase()))
                    this.registry.addLabel(name, x);
            } else {
                this._currentParentLabel = name;
                if (!this.registry.findLabel(name)) {
                    const doc = this._parseLabelDocComments(x);
                    this.registry.addLabel(name, x, doc);
                }
            }
        }

        // MASM label directive
        if (ctx.lower.startsWith("label") && ctx.words.length >= 2) {
            const name = ctx.words[1];
            this.registry.labelsEE.push(
                new Label(name, ctx.raw.substring(ctx.raw.indexOf(name) + name.length))
            );
        }
    }

    _detectVariable(ctx, x, clearPrevious) {
        if (!clearPrevious) return;
        if (ctx.words.length < 2 || !this.varRegex.test(ctx.words[1])) return;

        this.registry.addVariable({
            name:    ctx.words[0],
            type:    ctx.words[1],
            section: this.currentSection,
            line:    x
        });
    }

    async _detectProcedure(ctx, x, documentLines) {
        const match = ctx.clean.match(this.procRegex);
        if (!match || this.registry.findProcedure(match[1])) return;

        const name = match[1];
        const des  = this._parseProcDocComments(documentLines, x, name);

        const proc    = new Procedure(name, des);
        proc.section  = this.currentSection;
        proc.line     = x;
        this.registry.addProcedure(proc);
    }

    _parseLabelDocComments(labelLine) {
        const lines = this._lines || [];
        const text = [];
        for (let ptr = labelLine - 1; ptr >= 0; ptr--) {
            const prev = Utils.clearSpace(lines[ptr]);
            if (/^global\b/i.test(prev)) continue;
            if (!prev.startsWith(";")) break;
            text.unshift(lines[ptr].substring(lines[ptr].indexOf(";") + 1).trim());
        }
        if (text.length === 0) return null;
        const { Info } = require("./data/structs");
        const des = new Info("", "");
        for (const t of text) {
            if      (t.startsWith("@out: ")) des.output.push(t.substring(6).trim());
            else if (t.startsWith("@arg: ")) des.params.push(t.substring(6).trim());
            else                             des.des += t + "\n";
        }
        return des;
    }

    _parseProcDocComments(documentLines, procLine, name) {
        const des  = new Info("", "");
        const text = [];

        for (let ptr = procLine - 1; ptr >= 0; ptr--) {
            const prev = Utils.clearSpace(documentLines[ptr]);
            if (!prev.startsWith(";")) break;
            text.push(documentLines[ptr].substring(documentLines[ptr].indexOf(";") + 1));
        }

        for (const t of text) {
            if      (t.startsWith("@out: ")) des.output.push(t.substring(t.indexOf(" ", t.indexOf("@out: "))));
            else if (t.startsWith("@arg: ")) des.params.push(Utils.clearSpace(t.substring(t.indexOf(" ", t.indexOf("@arg: ")))));
            else                             des.des += t;
        }

        des.name = name;
        return des;
    }

    async _detectInclude(ctx) {
        if (!ctx.lower.startsWith("%include") && !ctx.lower.startsWith("include")) return;

        const fileMatch = ctx.raw.match(/['"](.*?)['"]/);
        if (!fileMatch || !this.currentFilePath) return;

        const baseDir    = path.dirname(this.currentFilePath);
        const normalized = path.normalize(path.resolve(baseDir, fileMatch[1]));

        if (!fs.existsSync(normalized) || this.registry.includedFiles.includes(normalized)) return;

        const filedata = fs.readFileSync(normalized, "utf8");
        this.registry.includedFiles.push(normalized);

        const oldSection = this.currentSection;
        await this.scan(filedata.split(/\r?\n/), false);
        this.currentSection = oldSection;
    }

    _detectMacro(ctx, x) {
        if (!this.macroRegex.test(ctx.raw) || ctx.words.length <= 1) return;
        const macroName = ctx.words[1];
        const argCount  = ctx.words.length > 2 ? parseInt(ctx.words[2], 10) : 0;
        if (!this.registry.findMacro(macroName))
            this.registry.addMacro(macroName, x, isNaN(argCount) ? 0 : argCount);
    }

    _detectDefine(ctx) {
        if (!this.defineRegex.test(ctx.raw) || ctx.words.length <= 1) return;
        const defineName = ctx.words[1];
        if (!this.registry.defines) this.registry.defines = [];
        if (!this.registry.defines.includes(defineName)) this.registry.defines.push(defineName);
    }

    _detectExtern(ctx, x) {
        if (ctx.words[0]?.toLowerCase() !== "extern" || ctx.words.length <= 1) return;
        const rest = ctx.noComment.replace(/^\s*extern\s+/i, '');
        for (const sym of rest.split(/[\s,]+/).map(s => s.trim()).filter(s => s && !s.startsWith(';'))) {
            this.registry.externs.add(sym.toLowerCase());
            if (!this.registry.findLabel(sym)) this.registry.addLabel(sym, x);
        }
    }
}

module.exports = { DocumentScanner };
