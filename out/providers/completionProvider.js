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
        
        // skip completion if typing String or Comment
        if (line.match(/(\")/g) || line.match(/^[^\"]*#[^\{].*$/)) return completions; 

        let words = Utils.splitLine(line).map(w => w.toLowerCase());
        let isRootLevel = !line.match(/^\s/); // is left most?
        let hasSpace = line.includes(' ') || line.includes('\t'); // already tab or spacebar?

        // ==========================================
        // 1: Root-Level Suggestions
        // ==========================================
        if (words.length === 0 || (words.length === 1 && !hasSpace)) {
            if (isRootLevel) {
                completions.items.push(this.createItem("section .data", KeywordType.savedWord, "(Section)", "Initialized data", "section .data\n\t"));
                completions.items.push(this.createItem("section .text", KeywordType.savedWord, "(Section)", "Code section", "section .text\n"));
                completions.items.push(this.createItem("section .bss", KeywordType.savedWord, "(Section)", "Uninitialized data", "section .bss\n\t"));
                completions.items.push(this.createItem("global", KeywordType.savedWord, "(Scope)", "Global symbol", "global"));
                completions.items.push(this.createItem("extern", KeywordType.savedWord, "(Scope)", "External symbol", "extern"));
            }
        }

        // ==========================================
        // 2: Section / Global command
        // ==========================================
        if (words.length > 0 && words[0] === "section") {
            if (hasSpace) {
                ["data", "text", "bss"].forEach(sec => completions.items.push(this.createItem("." + sec, KeywordType.savedWord, "", "", "." + sec)));
            }
            return completions;
        }

        if (words.length > 0 && (words[0] === "global" || words[0] === "extern")) {
            if (hasSpace) {
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
        // 4: .data and .bss
        // ==========================================
        if (isDataSection && !isRootLevel) {
            let trimmedLine = line.trimStart();
            
            // ถ้าย่อหน้าเข้ามาแล้ว แต่ยังไม่เคาะวรรคเลย (กำลังตั้งชื่อตัวแปร) ปิดเมนูกวนใจ
            if (trimmedLine.length === 0 || !/[\s\t]/.test(trimmedLine)) {
                return completions; 
            }
            
            // ถ้าพิมพ์ชื่อตัวแปรเสร็จแล้ว เคาะวรรค -> แนะนำ db, dw, resb
            let match = trimmedLine.match(/^([^\s\t]+)[\s\t]+([^\s\t]*)$/);
            if (match) {
                const dataKeywords = ["db", "dw", "dd", "dq", "dt", "equ", "resb", "resw", "resd", "resq"];
                dataKeywords.forEach(k => completions.items.push(this.createItem(k, KeywordType.memoryAllocation, "(Define/Reserve)")));
                return completions;
            }
            
            // ถ้าพิมพ์เกิน 2 คำไปแล้ว (เช่น msg db ...) ให้เงียบไว้
            return completions; 
        }

        // ==========================================
        // 5: typing in [...]
        // ==========================================
        let isInsideBracket = line.lastIndexOf('[') > line.lastIndexOf(']');
        if (isInsideBracket) {
            // อยู่ในวงเล็บ โชว์แค่ตัวแปรเท่านั้น
            this.registry.vars.forEach(v => completions.items.push(this.createItem(v.name, KeywordType.variable, "(Variable)")));
            return completions;
        }

        // ==========================================
        // 🚀 กฎที่ 6: การแนะนำ Register, ตัวแปร, ขนาดพอยเตอร์, และการ Jump
        // ==========================================
        if (words.length > 0 && !isDataSection) {
            let firstWord = words[0];
            let isJump = ["jmp","je","jne","jz","jnz","jg","jl","jge","jle","ja","jb","jae","jbe","call","loop","loope","loopne"].includes(firstWord);
            
            if (isJump) {
                // คำสั่งกระโดด โชว์แค่ Label และ Procedure
                this.registry.labels.forEach(l => completions.items.push(this.createItem(l, KeywordType.label, "(Label)")));
                this.registry.procs.forEach(p => completions.items.push(this.createItem(p.name, KeywordType.method, "(Procedure)")));
                return completions;
            }

            // ถ้ากำลังพิมพ์พารามิเตอร์หลังคำสั่ง (เช่น mov ...)
            if (hasSpace) {
                REGISTERS.forEach(r => completions.items.push(this.createItem(r, KeywordType.register)));
                this.registry.vars.forEach(v => completions.items.push(this.createItem(v.name, KeywordType.variable, "(Variable)")));
                ["byte", "word", "dword", "qword"].forEach(s => completions.items.push(this.createItem(s, KeywordType.size, "(Size)")));
                return completions; // จบตรงนี้ จะได้ไม่แสดงคำสั่ง Instruction ซ้ำซ้อนตอนหลังลูกน้ำ (,)
            }
        }

        // ==========================================
        // 🚀 กฎที่ 7: พิมพ์คำสั่งทั่วไป (ย่อหน้าปกติที่ยังไม่เว้นวรรค)
        // ==========================================
        if (hasSpace && !isDataSection) {
            KEYWORD_DICONTARY.forEach(k => {
                if ([KeywordType.instruction, KeywordType.memoryAllocation, KeywordType.precompiled].includes(k.type)) {
                    // ซ่อนคำสั่ง root-level ถ้าย่อหน้าไปแล้ว
                    if (!isRootLevel && ["section", "global", "extern"].includes(k.name)) return;
                    completions.items.push(this.createItem(k.name, k.type, Utils.getType(k.type), k.def));
                }
            });
        }

        // ==========================================
        // กรองไอเทมที่ซ้ำกันออก
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