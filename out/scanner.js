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
        this.varRegex = /\b(db|dw|dd|dq|dt|resb|resw|resd|resq|equ)\b/i;
        this.labelRegex = /^\s*([A-Za-z_.$?][\w.$?]*):/;
        this.procRegex = /^\s*([A-Za-z_.$?][\w.$?]*)\s+proc\b/i;

        this.macroRegex = /^\s*%macro\b/i;
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

            const line = documentLines[x];

            const cleanLine = Utils.clearSpace(line);
            const lowerCleanLine = cleanLine.toLowerCase();

            // remove comments safely
            const lineNoComment = line.replace(/;.*$/, "").trim();

            // ==========================================
            // 1. Section detection
            // ==========================================

            if (
                lowerCleanLine.startsWith("section") ||
                lowerCleanLine.startsWith("segment")
            ) {

                let words = this.tokenizer.tokenize(line);

                if (words.length > 1) {
                    this.currentSection = words[1].toLowerCase();
                }

                continue;
            }

            // ==========================================
            // 2. Label detection
            // ==========================================

            const labelMatch = lineNoComment.match(this.labelRegex);

            if (labelMatch) {

                const labelName = labelMatch[1];

                if (!this.registry.findLabel(labelName)) {
                    this.registry.addLabel(labelName);
                }

            }

            // MASM label directive

            if (lowerCleanLine.startsWith("label")) {

                let words = this.tokenizer.tokenize(line);

                if (words.length >= 2) {

                    const name = words[1];

                    this.registry.labelsEE.push(
                        new Label(
                            name,
                            line.substring(line.indexOf(name) + name.length)
                        )
                    );
                }
            }

            // ==========================================
            // 3. Variable detection
            // ==========================================

            let words = this.tokenizer.tokenize(line);

            const isVar =
                words.length >= 2 &&
                this.varRegex.test(words[1]);

            if (isVar && clearPrevious) {

                const name = words[0];
                const type = words[1];

                this.registry.addVariable({
                    name: name,
                    type: type,
                    section: this.currentSection
                });

            }

            // ==========================================
            // 4. Procedure detection
            // ==========================================

            const procMatch = cleanLine.match(this.procRegex);

            if (procMatch) {

                const name = procMatch[1];

                let des = new Info("", "");
                let text = [];

                let ptr = x;

                while (ptr - 1 >= 0) {

                    ptr--;

                    const prevLine = Utils.clearSpace(documentLines[ptr]);

                    if (prevLine.startsWith(";")) {

                        text.push(
                            documentLines[ptr].substring(
                                documentLines[ptr].indexOf(";") + 1
                            )
                        );

                    } else {
                        break;
                    }
                }

                for (let t of text) {

                    if (t.startsWith("@out: ")) {

                        des.output.push(
                            t.substring(t.indexOf(" ", t.indexOf("@out: ")))
                        );

                    } else if (t.startsWith("@arg: ")) {

                        des.params.push(
                            Utils.clearSpace(
                                t.substring(t.indexOf(" ", t.indexOf("@arg: ")))
                            )
                        );

                    } else {

                        des.des += t;

                    }
                }

                des.name = name;

                if (!this.registry.findProcedure(name)) {

                    let proc = new Procedure(name, des);
                    proc.section = this.currentSection;

                    this.registry.addProcedure(proc);

                }

            }

            // ==========================================
            // 5. Include detection
            // ==========================================

            if (
                lowerCleanLine.startsWith("%include") ||
                lowerCleanLine.startsWith("include")
            ) {

                const fileNameMatch = line.match(/['"](.*?)['"]/);

                if (fileNameMatch && vscode.window.activeTextEditor) {

                    const baseDir = path.dirname(
                        vscode.window.activeTextEditor.document.uri.fsPath
                    );

                    const fileName = path.resolve(
                        baseDir,
                        fileNameMatch[1]
                    );

                    const normalized = path.normalize(fileName);

                    if (
                        fs.existsSync(normalized) &&
                        !this.registry.includedFiles.includes(normalized)
                    ) {

                        const filedata = fs.readFileSync(normalized, "utf8");

                        this.registry.includedFiles.push(normalized);

                        const oldSection = this.currentSection;

                        await this.scan(
                            filedata.split(/\r?\n/),
                            false
                        );

                        this.currentSection = oldSection;
                    }
                }
            }

            // ==========================================
            // 6. Macro detection
            // ==========================================

            if (this.macroRegex.test(line)) {

                let words = this.tokenizer.tokenize(line);

                if (words.length > 1) {

                    const macroName = words[1];

                    if (!this.registry.findMacro(macroName)) {
                        this.registry.addMacro(macroName);
                    }

                }
            }

            // ==========================================
            // 7. Define detection
            // ==========================================

            if (this.defineRegex.test(line)) {

                let words = this.tokenizer.tokenize(line);

                if (words.length > 1) {

                    const defineName = words[1];

                    if (!this.registry.defines) {
                        this.registry.defines = [];
                    }

                    if (!this.registry.defines.includes(defineName)) {
                        this.registry.defines.push(defineName);
                    }

                }
            }

            // ==========================================
            // 8. Extern detection
            // ==========================================

            if (lowerCleanLine.startsWith("extern")) {

                let words = this.tokenizer.tokenize(line);

                if (words.length > 1) {

                    const externName = words[1];

                    if (!this.registry.findLabel(externName)) {
                        this.registry.addLabel(externName);
                    }

                }
            }

        }
    }
}

module.exports = { DocumentScanner };