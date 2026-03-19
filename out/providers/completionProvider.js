"use strict";

const vscode = require("vscode");
const { Utils } = require("../utils");
const { KeywordType } = require("../data/enums");
const { KEYWORD_MAP, REGISTERS, AVX_REGISTERS, PREPROCESSOR } = require("../data/keywords");
const { OperandType } = require("../data/operandTypes");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");
const { MemoryAddressParser } = require("../engine/memoryAddressParser");

class AsmCompletionProvider {

    constructor(registry, scanner) {

        this.registry = registry;
        this.scanner = scanner;

        // fast jump lookup
        this.jumpSet = new Set([
            "jmp","je","jne","jz","jnz",
            "jg","jl","jge","jle",
            "ja","jb","jae","jbe",
            "call","loop","loope","loopne"
        ]);
        this.sizeKeywords = [
            "byte",
            "word",
            "dword",
            "qword",
            "tword",
            "oword",
            "yword",
            "zword"
        ];
        this.scales = ["1","2","4","8"];

        // cache keyword list
        this.keywordList = Array.from(KEYWORD_MAP.values());
    }

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
            [KeywordType.file]: vscode.CompletionItemKind.File,
            [KeywordType.constant]: vscode.CompletionItemKind.Value,
            [KeywordType.operator]: vscode.CompletionItemKind.Operator,
        };

        return kinds[kind] || vscode.CompletionItemKind.Text;
    }

    createItem(name, type, detail = '', doc = "", insertText = null) {

        const item = new vscode.CompletionItem(name, this.getItemKind(type));

        item.detail = detail;
        item.documentation = doc;
        item.sortText = "00_" + name;

        if (insertText) item.insertText = insertText;

        return item;
    }

    getOperandIndex(line) {
        const noComment = line.split(";")[0];
        const parts = noComment.split(",");
        return parts.length - 1;
    }
    getAllowedOperandTypes(instruction, operandIndex) {
        const sigs = INSTRUCTION_SIGNATURES[instruction];

        if (!sigs) return null;
        
        let types = 0;
        let found = false;

        for (const sig of sigs) {
            if (sig.length > operandIndex) {
                types |= sig[operandIndex];
                found = true;
            }
        }
        return found ? types : undefined;
    }

    async provideCompletionItems(document, position, token, context) {

        const completions = new vscode.CompletionList([], false);

        // scan document only when trigger manually
        if (context.triggerKind === vscode.CompletionTriggerKind.Invoke) {
            const docLines = document.getText().split(/\r?\n/);
            await this.scanner.scan(docLines);
        }

        const line = document.lineAt(position.line).text.slice(0, position.character);

        // comment detection
        const commentIndex = line.indexOf(';');
        if (commentIndex !== -1 && commentIndex < position.character) {
            return completions;
        }

        // string detection
        const quotes = line.match(/['"]/g);
        if (quotes && quotes.length % 2 !== 0) {
            return completions;
        }

        const trimmed = line.trimStart();
        const isRootLevel = line.length === trimmed.length;

        const words = trimmed.length > 0
            ? trimmed.split(/\s+/).map(w => w.toLowerCase())
            : [];

        const isTypingOperand =
            words.length > 1 || (words.length === 1 && /\s$/.test(line));

        /* =======================================
           PREPROCESSOR
        ======================================= */

        if (trimmed.startsWith('%')) {

            for (const p of PREPROCESSOR) {
                completions.items.push(
                    this.createItem(p.name, KeywordType.precompiled, p.detail, p.doc)
                );
            }

            for (const m of this.registry.macros) {
                completions.items.push(
                    this.createItem(m, KeywordType.macro, "(Macro)")
                );
            }

            return completions;
        }

        /* =======================================
           ROOT LEVEL
        ======================================= */

        if (words.length === 0 || (words.length === 1 && !isTypingOperand)) {

            if (isRootLevel) {
                completions.items.push(
                    this.createItem("section .data", KeywordType.savedWord)
                );
                completions.items.push(
                    this.createItem("section .text", KeywordType.savedWord)
                );
                completions.items.push(
                    this.createItem("section .bss", KeywordType.savedWord)
                );
                completions.items.push(
                    this.createItem("global", KeywordType.savedWord)
                );
                completions.items.push(
                    this.createItem("extern", KeywordType.savedWord)
                );
            }
        }

        /* =======================================
           SECTION COMMAND
        ======================================= */

        if (words[0] === "section" && isTypingOperand) {

            for (const sec of ["data","text","bss"]) {
                completions.items.push(
                    this.createItem("." + sec, KeywordType.savedWord)
                );
            }

            return completions;
        }

        /* =======================================
           BRACKET MEMORY
        ======================================= */

        const open = line.lastIndexOf("[");
        const close = line.lastIndexOf("]");
        const isInsideBracket = open !== -1 && open > close;

        if (isInsideBracket) {
            const expr = line.slice(open + 1);
            const state = MemoryAddressParser.parse(expr);

            switch (state) {
                case "BASE":
                    // ยังไม่มีอะไร → แนะนำ register และ variable
                    for (const v of this.registry.vars) {
                        completions.items.push(
                            this.createItem(v.name, KeywordType.variable)
                        );
                    }
                    for (const r of REGISTERS) {
                        completions.items.push(
                            this.createItem(r, KeywordType.register)
                        );
                    }
                    break;

                case "BASE_DONE":
                    // พิมพ์ base เสร็จแล้ว → แนะนำ + เพื่อต่อ index
                    completions.items.push(
                        this.createItem("+", KeywordType.operator, "(Offset)")
                    );
                    break;

                case "INDEX":
                    // หลัง + → แนะนำ index register
                    for (const r of REGISTERS) {
                        completions.items.push(
                            this.createItem(r, KeywordType.register)
                        );
                    }
                    break;

                case "INDEX_DONE":
                    // พิมพ์ index เสร็จแล้ว → แนะนำ * เพื่อใส่ scale
                    completions.items.push(
                        this.createItem("*", KeywordType.operator, "(Scale)")
                    );
                    break;

                case "SCALE_INPUT":
                    // หลัง * → แนะนำค่า scale
                    for (const s of ["1","2","4","8"]) {
                        completions.items.push(
                            this.createItem(s, KeywordType.constant, "(Scale)")
                        );
                    }
                    break;

                case "SCALE_DONE":
                    // scale เสร็จแล้ว → ไม่แนะนำอะไร
                    break;
            }
            return completions;
        }

        /* =======================================
           OPERANDS
        ======================================= */
        if (isTypingOperand) {
            const firstWord = words[0].toLowerCase();
            // ถ้ายังไม่มี signature ของ instruction → น่าจะเป็น variable declaration
            if (!INSTRUCTION_SIGNATURES[firstWord]) {
                const MEM_DIRECTIVES = ['db','dw','dd','dq','dt','resb','resw','resd','resq','equ'];
                // แนะนำ directive เฉพาะตอนที่ยังไม่ได้พิมพ์ directive (word ที่ 2 ยังว่าง หรือกำลังพิมพ์อยู่)
                const secondWord = words.filter(w => w.length > 0)[1] || '';
                if (!MEM_DIRECTIVES.includes(secondWord)) {
                    for (const d of MEM_DIRECTIVES) {
                        const kw = KEYWORD_MAP.get(d);
                        completions.items.push(
                            this.createItem(d, KeywordType.memoryAllocation, kw ? kw.def : '(Memory)')
                        );
                    }
                }
                return completions;
            }
            const operandIndex = this.getOperandIndex(line);
            const allowed =
                this.getAllowedOperandTypes(firstWord, operandIndex);

            if (allowed === undefined) {
                return completions;
            }
            /* REGISTER */
            if (allowed & OperandType.REG) {
                REGISTERS.forEach(r =>
                    completions.items.push(
                        this.createItem(r, KeywordType.register)
                    )
                );
                AVX_REGISTERS.forEach(r =>
                    completions.items.push(
                        this.createItem(r, KeywordType.register)
                    )
                );
            }
            /* SIZE */
            if (allowed & OperandType.MEM) {
                for (const s of this.sizeKeywords) {
                    completions.items.push(
                        this.createItem(s, KeywordType.size, "(Size)")
                    );
                }
            }
            /* MEMORY */
            if (allowed & OperandType.MEM) {
                for (const v of this.registry.vars) {
                    completions.items.push(
                        this.createItem(v.name, KeywordType.variable)
                    );
                }
            }
            /* IMMEDIATE */
            if (allowed & OperandType.IMM) {
                completions.items.push(
                    this.createItem("0", KeywordType.constant, "(Immediate)")
                );
            }
            /* LABEL */
            if (allowed & OperandType.LABEL) {
                this.registry.labels.forEach(l =>
                    completions.items.push(
                        this.createItem(l, KeywordType.label)
                    )
                );
                this.registry.procs.forEach(p =>
                    completions.items.push(
                        this.createItem(p.name, KeywordType.method)
                    )
                );
            }
            return completions;
        }

        /* =======================================
           INSTRUCTIONS
        ======================================= */

        if (trimmed.length > 0) {
            const partial = (words[0] || '').toLowerCase();

            for (const k of this.keywordList) {

                if (
                    k.type === KeywordType.instruction ||
                    k.type === KeywordType.memoryAllocation ||
                    k.type === KeywordType.precompiled
                ) {
                    // แสดงเฉพาะ keyword ที่ขึ้นต้นด้วย partial word ที่กำลังพิมพ์
                    if (k.name.toLowerCase().startsWith(partial)) {
                        completions.items.push(
                            this.createItem(k.name, k.type, Utils.getType(k.type), k.def)
                        );
                    }
                }
            }
        }

        /* =======================================
           REMOVE DUPLICATE
        ======================================= */

        const seen = new Set();

        completions.items = completions.items.filter(item => {

            if (seen.has(item.label)) return false;

            seen.add(item.label);

            return true;
        });

        return completions;
    }
}

module.exports = { AsmCompletionProvider };