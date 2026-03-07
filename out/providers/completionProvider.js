"use strict";
const vscode = require("vscode");
const { Utils } = require("../utils");
const { KeywordType } = require("../data/enums");
const { KEYWORD_DICONTARY, REGISTERS } = require("../data/keywords");

class AsmCompletionProvider {
    constructor(registry, scanner) {
        this.registry = registry;
        this.scanner = scanner;
    }

    // convert KeywordType to CompletionItemKind of VS Code
    getItemKind(kind) {
        const kinds = {
            [KeywordType.instruction]: vscode.CompletionItemKind.Keyword,
            [KeywordType.memoryAllocation]: vscode.CompletionItemKind.Keyword,
            [KeywordType.precompiled]: vscode.CompletionItemKind.Interface,
            [KeywordType.register]: vscode.CompletionItemKind.Constant,
            [KeywordType.savedWord]: vscode.CompletionItemKind.Property,
            [KeywordType.size]: vscode.CompletionItemKind.Constructor,
            [KeywordType.variable]: vscode.CompletionItemKind.Variable,
            [KeywordType.method]: vscode.CompletionItemKind.Method,
            [KeywordType.structure]: vscode.CompletionItemKind.Struct,
            [KeywordType.label]: vscode.CompletionItemKind.Unit,
            [KeywordType.macro]: vscode.CompletionItemKind.Color,
            [KeywordType.file]: vscode.CompletionItemKind.File
        };
        return kinds[kind] || vscode.CompletionItemKind.Text;
    }

    // function help make item fast
    createItem(name, type, detail = '', doc = "", insertText = null) {
        let item = new vscode.CompletionItem(name, this.getItemKind(type));
        item.detail = detail;
        item.documentation = doc;
        item.sortText = "01_" + name; // set priority
        if (insertText) item.insertText = insertText;
        return item;
    }

async provideCompletionItems(document, position, token, context) {
        let completions = new vscode.CompletionList();
        
        // 1. update from lastet data from doc
        let docText = [];
        for (let i = 0; i < document.lineCount; i++) docText.push(document.lineAt(i).text);
        await this.scanner.scan(docText);

        // 2. current typing line
        let line = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
        
        // skip Auto-complete if in Comment of YASM (;)
        if (line.match(/(\")/g) || line.includes(';')) return completions; 

        let trimmedLine = line.trimStart();
        let isRootLevel = (line.length === trimmedLine.length); // is Root Level?
        
        // sperate word using whitespace (space, tab)
        let words = trimmedLine.length > 0 ? trimmedLine.split(/[\s\t]+/).map(w => w.toLowerCase()) : [];
        
        // FIX : add check typing parameter (Operand) or not 
        // (if more than 1 word or finish typing and last is space)
        let isTypingOperand = words.length > 1 || (words.length === 1 && /[\s\t]$/.test(line));

        // ==========================================
        // 1: Root-Level Suggestions
        // ==========================================
        if (words.length === 0 || (words.length === 1 && !isTypingOperand)) {
            if (isRootLevel) {
                completions.items.push(this.createItem("section .data", KeywordType.savedWord, "(Section)", "Initialized data", "section .data\n"));
                completions.items.push(this.createItem("section .text", KeywordType.savedWord, "(Section)", "Code section", "section .text\n"));
                completions.items.push(this.createItem("section .bss", KeywordType.savedWord, "(Section)", "Uninitialized data", "section .bss\n"));
                completions.items.push(this.createItem("global", KeywordType.savedWord, "(Scope)", "Global symbol", "global"));
                completions.items.push(this.createItem("extern", KeywordType.savedWord, "(Scope)", "External symbol", "extern"));
            }
        }

        // ==========================================
        // 2: Section / Global command
        // ==========================================
        if (words.length > 0 && words[0] === "section") {
            if (isTypingOperand) {
                ["data", "text", "bss"].forEach(sec => completions.items.push(this.createItem("." + sec, KeywordType.savedWord, "", "", "." + sec)));
            }
            return completions;
        }

        if (words.length > 0 && (words[0] === "global" || words[0] === "extern")) {
            if (isTypingOperand) {
                completions.items.push(this.createItem("_start", KeywordType.label, "(Entry)", "Standard execution entry point"));
                this.registry.labels.forEach(l => completions.items.push(this.createItem(l, KeywordType.label, "(Label)")));
                this.registry.procs.forEach(p => completions.items.push(this.createItem(p.name, KeywordType.method, "(Procedure)")));
            }
            return completions;
        }

        // ==========================================
        // 3: check typing in which Section
        // ==========================================
        let isDataSection = false;
        for (let i = position.line; i >= 0; i--) {
            let textLine = document.lineAt(i).text.toLowerCase();
            if (textLine.includes("section .data") || textLine.includes("section .bss")) {
                isDataSection = true; break;
            } else if (textLine.includes("section .text") || textLine.includes("section .code")) {
                break; 
            }
        }

        // ==========================================
        // 4: .data และ .bss 
        // ==========================================
        if (isDataSection) {
            if (!isTypingOperand) {
                return completions; 
            }
            
            // FIX : disable isRootLevel. if firstword complete -> suggest db, dw
            if (words.length === 1 || (words.length === 2 && !/[\s\t]$/.test(line))) {
                const dataKeywords = ["db", "dw", "dd", "dq", "dt", "equ", "resb", "resw", "resd", "resq"];
                dataKeywords.forEach(k => completions.items.push(this.createItem(k, KeywordType.memoryAllocation, "(Define/Reserve)")));
                return completions;
            }
            
            // more than 2 word, then stop Data section suggest
            return completions; 
        }

        // ==========================================
        // 5: typing in [...]
        // ==========================================
        let isInsideBracket = line.lastIndexOf('[') > line.lastIndexOf(']');
        if (isInsideBracket) {
            // 1. add Variable (sortText 00)
            this.registry.vars.forEach(v => {
                let item = this.createItem(v.name, KeywordType.variable, "(Variable)");
                item.sortText = "00_" + v.name;
                completions.items.push(item);
            });

            // 2. add Register (sortText 01)
            REGISTERS.forEach(r => {
                let item = this.createItem(r, KeywordType.register, "(Register)");
                item.sortText = "01_" + r;
                completions.items.push(item);
            });
            return completions;
        }

        // ==========================================
        // 6: typing Operands or parameter
        // ==========================================
        if (isTypingOperand && !isDataSection) {
            let firstWord = words[0];
            let isJump = ["jmp","je","jne","jz","jnz","jg","jl","jge","jle","ja","jb","jae","jbe","call","loop","loope","loopne"].includes(firstWord);
            
            if (isJump) {
                // jump command show only Label and Procedure
                this.registry.labels.forEach(l => completions.items.push(this.createItem(l, KeywordType.label, "(Label)")));
                this.registry.procs.forEach(p => completions.items.push(this.createItem(p.name, KeywordType.method, "(Procedure)")));
            } else {
                // normal command suggest Register, variable and size
                REGISTERS.forEach(r => completions.items.push(this.createItem(r, KeywordType.register)));
                this.registry.vars.forEach(v => completions.items.push(this.createItem(v.name, KeywordType.variable, "(Variable)")));
                ["byte", "word", "dword", "qword"].forEach(s => completions.items.push(this.createItem(s, KeywordType.size, "(Size)")));
            }

            return completions; 
        }

        // ==========================================
        // 7: Instructions
        // ==========================================
        // fix rule: 
        // 1. not a parameter (no content before typing space)
        // 2. not in Data Section
        let isTypingOp = /[\s\t]/.test(trimmedLine); // have space in first word?

        if (!isDataSection && !isTypingOp && trimmedLine.length > 0) {
            KEYWORD_DICONTARY.forEach(k => {
                if ([KeywordType.instruction, KeywordType.memoryAllocation, KeywordType.precompiled].includes(k.type)) {
                    // if not RootLevel, don't suggest section/global
                    if (!isRootLevel && ["section", "global", "extern"].includes(k.name)) return;
                    completions.items.push(this.createItem(k.name, k.type, Utils.getType(k.type), k.def));
                }
            });
        }

        // ==========================================
        // filter same item
        // ==========================================
        let uniqueItems = [];
        let labelsSeen = new Set();
        for (let item of completions.items) {
            if (!labelsSeen.has(item.label)) {
                labelsSeen.add(item.label);
                uniqueItems.push(item);
            }
        }
        completions.items = uniqueItems;

        return completions;
    }
}

module.exports = { AsmCompletionProvider };