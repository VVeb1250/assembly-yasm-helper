"use strict";

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { AsmTokenizer } = require("./tokenizer");
const { Utils } = require("./utils");
const { Info, Procedure, Label } = require("./data/structs");

class DocumentScanner {

    constructor(registry) {
        this.tokenizer = new AsmTokenizer();
        this.registry = registry;
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
            if (vscode.window.activeTextEditor) {
                const file = vscode.window.activeTextEditor.document.uri.fsPath;
                this.registry.includedFiles.push(path.normalize(file));
            }
        }
        this.currentSection = "";

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
        if (match && !this.registry.findLabel(match[1])) {
            this.registry.addLabel(match[1], x);
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
        if (!fileMatch || !vscode.window.activeTextEditor) return;

        const baseDir    = path.dirname(vscode.window.activeTextEditor.document.uri.fsPath);
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
        if (!this.registry.findMacro(macroName)) this.registry.addMacro(macroName, x);
    }

    _detectDefine(ctx) {
        if (!this.defineRegex.test(ctx.raw) || ctx.words.length <= 1) return;
        const defineName = ctx.words[1];
        if (!this.registry.defines) this.registry.defines = [];
        if (!this.registry.defines.includes(defineName)) this.registry.defines.push(defineName);
    }

    _detectExtern(ctx, x) {
        if (ctx.words[0]?.toLowerCase() !== "extern" || ctx.words.length <= 1) return;
        const externName = ctx.words[1];
        if (!this.registry.findLabel(externName)) this.registry.addLabel(externName, x);
    }
}

module.exports = { DocumentScanner };
