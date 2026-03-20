"use strict";

const vscode = require("vscode");
const { Utils } = require("../utils");
const { KeywordType } = require("../data/enums");
const { KEYWORD_MAP, REGISTERS, AVX_REGISTERS, PREPROCESSOR } = require("../data/keywords");
const { OperandType } = require("../data/operandTypes");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");
const { MemoryAddressParser } = require("../engine/memoryAddressParser");

const MEM_DIRECTIVES   = ['db','dw','dd','dq','dt','resb','resw','resd','resq','equ'];
const INSTRUCTION_TYPES = new Set([KeywordType.instruction, KeywordType.memoryAllocation, KeywordType.precompiled]);

class AsmCompletionProvider {

    constructor(registry, scanner) {
        this.registry = registry;
        this.scanner  = scanner;

        this.sizeKeywords = ["byte","word","dword","qword","tword","oword","yword","zword"];
        this.keywordList  = Array.from(KEYWORD_MAP.values());
    }

    // -------------------------------------------------------
    // VSCode API entry point
    // -------------------------------------------------------

    async provideCompletionItems(document, position, token, context) {
        const completions = new vscode.CompletionList([], false);

        // suppress when triggered by Tab unless user enables it
        if (context.triggerCharacter === '\t') {
            const cfg = vscode.workspace.getConfiguration('assembly');
            if (!cfg.get('tabTriggerCompletions')) return completions;
        }

        if (context.triggerKind === vscode.CompletionTriggerKind.Invoke) {
            await this.scanner.scan(document.getText().split(/\r?\n/));
        }

        const line = document.lineAt(position.line).text.slice(0, position.character);

        if (this._isInComment(line, position.character)) return completions;
        if (this._isInString(line))                      return completions;

        const trimmed        = line.trimStart();
        const isRootLevel    = line.length === trimmed.length;
        const words          = trimmed.length > 0 ? trimmed.split(/\s+/).map(w => w.toLowerCase()) : [];
        const isTypingOperand = words.length > 1 || (words.length === 1 && /\s$/.test(line));

        if (trimmed.startsWith('%'))
            return this._completePreprocessor(completions, document, position);

        if (!isTypingOperand)
            this._addRootLevelItems(isRootLevel, completions);

        if (words[0] === "section" && isTypingOperand)
            return this._completeSection(completions);

        if (this._isInsideBracket(line))
            return this._completeBracketMemory(line, completions);

        if (isTypingOperand) {
            if (this._shouldSuppressSpaceTrigger(context, line, words)) return completions;
            return this._completeOperands(words, line, completions);
        }

        if (trimmed.length > 0)
            this._completeInstructions(words, completions);

        return this._deduplicate(completions);
    }

    // -------------------------------------------------------
    // Guards
    // -------------------------------------------------------

    _isInComment(line, character) {
        const idx = line.indexOf(';');
        return idx !== -1 && idx < character;
    }

    _isInString(line) {
        const quotes = line.match(/['"]/g);
        return !!(quotes && quotes.length % 2 !== 0);
    }

    _isInsideBracket(line) {
        return line.lastIndexOf("[") > line.lastIndexOf("]");
    }

    _shouldSuppressSpaceTrigger(context, line, words) {
        if (context.triggerCharacter !== ' ') return false;
        const noComment = line.split(';')[0];
        const commaIdx  = noComment.lastIndexOf(',');
        const slotText  = commaIdx !== -1
            ? noComment.slice(commaIdx + 1)
            : noComment.slice(noComment.search(/\S/) + words[0].length);
        return slotText.trim().length > 0;
    }

    // -------------------------------------------------------
    // Completion sections
    // -------------------------------------------------------

    _completePreprocessor(completions, document, position) {
        for (const p of PREPROCESSOR)
            completions.items.push(this.createItem(p.name, KeywordType.precompiled, p.detail, p.doc, null, "01"));
        for (const m of this.registry.macros)
            completions.items.push(this.createItem(m.name, KeywordType.macro, "(Macro)", '', null, "05"));

        // offer %1..%N inside macro body
        if (document && position) {
            const argCount = this._getMacroArgCount(document, position.line);
            if (argCount > 0) {
                for (let i = 1; i <= argCount; i++)
                    completions.items.push(this.createItem(`%${i}`, KeywordType.constant, `(Macro arg ${i})`, '', null, "01"));
            }
        }
        return completions;
    }

    // Scan upward from lineIdx to detect enclosing %macro..%endmacro and return its argCount
    _getMacroArgCount(document, lineIdx) {
        for (let i = lineIdx - 1; i >= 0; i--) {
            const raw = document.lineAt(i).text.trim().toLowerCase();
            if (raw.startsWith('%endmacro')) return 0;
            if (raw.startsWith('%macro')) {
                const parts = raw.split(/\s+/);
                const n = parseInt(parts[2], 10);
                return isNaN(n) ? 0 : n;
            }
        }
        return 0;
    }

    _addRootLevelItems(isRootLevel, completions) {
        if (!isRootLevel) return;
        for (const sec of ["section .data", "section .text", "section .bss"])
            completions.items.push(this.createItem(sec, KeywordType.savedWord));
        completions.items.push(this.createItem("global", KeywordType.savedWord));
        completions.items.push(this.createItem("extern", KeywordType.savedWord));
    }

    _completeSection(completions) {
        for (const sec of ["data", "text", "bss"])
            completions.items.push(this.createItem("." + sec, KeywordType.savedWord));
        return completions;
    }

    _completeBracketMemory(line, completions) {
        const expr  = line.slice(line.lastIndexOf("[") + 1);
        const state = MemoryAddressParser.parse(expr);

        switch (state) {
            case "BASE":
                for (const v of this.registry.vars)
                    completions.items.push(this.createItem(v.name, KeywordType.variable, '', '', null, "01"));
                for (const r of REGISTERS)
                    completions.items.push(this.createItem(r, KeywordType.register, '', '', null, "02"));
                break;
            case "BASE_DONE":
                completions.items.push(this.createItem("+", KeywordType.operator, "(Offset)"));
                break;
            case "INDEX":
                for (const r of REGISTERS)
                    completions.items.push(this.createItem(r, KeywordType.register));
                break;
            case "INDEX_DONE":
                completions.items.push(this.createItem("*", KeywordType.operator, "(Scale)"));
                break;
            case "SCALE_INPUT":
                for (const s of ["1","2","4","8"])
                    completions.items.push(this.createItem(s, KeywordType.constant, "(Scale)"));
                break;
        }
        return completions;
    }

    _completeOperands(words, line, completions) {
        const firstWord = words[0].toLowerCase();

        if (!INSTRUCTION_SIGNATURES[firstWord]) {
            if (this.registry.findMacro(firstWord))
                return this._completeMacroOperands(completions);
            return this._completeMemoryDirectives(words, completions);
        }

        const allowed = this.getAllowedOperandTypes(firstWord, this.getOperandIndex(line));
        if (allowed === undefined) return completions;

        if (allowed & OperandType.MEM) {
            for (const s of this.sizeKeywords)
                completions.items.push(this.createItem(s, KeywordType.size, "(Size)", '', null, "01"));
            for (const v of this.registry.vars)
                completions.items.push(this.createItem(v.name, KeywordType.variable, '', '', null, "02"));
        }
        if (allowed & OperandType.REG) {
            REGISTERS.forEach(r     => completions.items.push(this.createItem(r, KeywordType.register, '', '', null, this._regPrefix(r))));
            AVX_REGISTERS.forEach(r => completions.items.push(this.createItem(r, KeywordType.register, '', '', null, "05")));
        }
        if (allowed & OperandType.IMM) {
            completions.items.push(this.createItem("0", KeywordType.constant, "(Immediate)", '', null, "04"));
            for (const d of this.registry.defines || [])
                completions.items.push(this.createItem(d, KeywordType.constant, "(%define)", '', null, "04"));
        }
        if (allowed & OperandType.LABEL) {
            const labelPrefix = (allowed === OperandType.LABEL) ? "01" : "02";
            this.registry.labels.forEach(l => completions.items.push(this.createItem(l.name, KeywordType.label, '', '', null, labelPrefix)));
            this.registry.procs.forEach(p  => completions.items.push(this.createItem(p.name, KeywordType.method, '', '', null, labelPrefix)));
        }
        return completions;
    }

    _completeMacroOperands(completions) {
        for (const s of this.sizeKeywords)
            completions.items.push(this.createItem(s, KeywordType.size, "(Size)", '', null, "01"));
        for (const v of this.registry.vars)
            completions.items.push(this.createItem(v.name, KeywordType.variable, '', '', null, "02"));
        REGISTERS.forEach(r     => completions.items.push(this.createItem(r, KeywordType.register, '', '', null, this._regPrefix(r))));
        AVX_REGISTERS.forEach(r => completions.items.push(this.createItem(r, KeywordType.register, '', '', null, "05")));
        completions.items.push(this.createItem("0", KeywordType.constant, "(Immediate)", '', null, "04"));
        for (const d of this.registry.defines || [])
            completions.items.push(this.createItem(d, KeywordType.constant, "(%define)", '', null, "04"));
        this.registry.labels.forEach(l => completions.items.push(this.createItem(l.name, KeywordType.label, '', '', null, "04")));
        return completions;
    }

    _completeMemoryDirectives(words, completions) {
        const secondWord = words.filter(w => w.length > 0)[1] || '';
        if (!MEM_DIRECTIVES.includes(secondWord)) {
            for (const d of MEM_DIRECTIVES) {
                const kw = KEYWORD_MAP.get(d);
                completions.items.push(this.createItem(d, KeywordType.memoryAllocation, kw ? kw.def : '(Memory)'));
            }
        }
        return completions;
    }

    _completeInstructions(words, completions) {
        const partial = (words[0] || '').toLowerCase();
        for (const k of this.keywordList) {
            if (INSTRUCTION_TYPES.has(k.type) && k.name.toLowerCase().startsWith(partial))
                completions.items.push(this.createItem(k.name, k.type, Utils.getType(k.type), k.def));
        }
        for (const m of this.registry.macros) {
            if (m.name.toLowerCase().startsWith(partial))
                completions.items.push(this.createItem(m.name, KeywordType.macro, "(Macro)", m.doc || '', null, "01"));
        }
    }

    _deduplicate(completions) {
        const seen = new Set();
        completions.items = completions.items.filter(item => {
            if (seen.has(item.label)) return false;
            seen.add(item.label);
            return true;
        });
        return completions;
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------

    getOperandIndex(line) {
        return line.split(";")[0].split(",").length - 1;
    }

    getAllowedOperandTypes(instruction, operandIndex) {
        const sigs = INSTRUCTION_SIGNATURES[instruction];
        if (!sigs) return null;

        let types = 0, found = false;
        for (const sig of sigs) {
            if (sig.length > operandIndex) { types |= sig[operandIndex]; found = true; }
        }
        return found ? types : undefined;
    }

    getItemKind(kind) {
        const kinds = {
            [KeywordType.instruction]:      vscode.CompletionItemKind.Keyword,
            [KeywordType.memoryAllocation]: vscode.CompletionItemKind.Keyword,
            [KeywordType.precompiled]:      vscode.CompletionItemKind.Interface,
            [KeywordType.register]:         vscode.CompletionItemKind.Constant,
            [KeywordType.savedWord]:        vscode.CompletionItemKind.Property,
            [KeywordType.size]:             vscode.CompletionItemKind.Constructor,
            [KeywordType.variable]:         vscode.CompletionItemKind.Variable,
            [KeywordType.method]:           vscode.CompletionItemKind.Method,
            [KeywordType.structure]:        vscode.CompletionItemKind.Struct,
            [KeywordType.label]:            vscode.CompletionItemKind.Unit,
            [KeywordType.macro]:            vscode.CompletionItemKind.Function,
            [KeywordType.file]:             vscode.CompletionItemKind.File,
            [KeywordType.constant]:         vscode.CompletionItemKind.Value,
            [KeywordType.operator]:         vscode.CompletionItemKind.Operator,
        };
        return kinds[kind] || vscode.CompletionItemKind.Text;
    }

    // 03 = 64/32-bit GP,  04 = 16/8-bit + segment + other,  05 = SIMD (xmm/ymm/zmm/k)
    _regPrefix(reg) {
        const r = reg.toLowerCase();
        if (/^(xmm|ymm|zmm)\d+$/.test(r) || /^k\d+$/.test(r)) return "05";
        if (/^(r(ax|bx|cx|dx|si|di|bp|sp)|r\d+)$/.test(r))    return "03"; // 64-bit GP
        if (/^(e(ax|bx|cx|dx|si|di|bp|sp)|r\d+d)$/.test(r))   return "03"; // 32-bit GP
        return "04"; // 16-bit, 8-bit, segment, cr/dr, rip, flags
    }

    createItem(name, type, detail = '', doc = "", insertText = null, sortPrefix = "02") {
        const item       = new vscode.CompletionItem(name, this.getItemKind(type));
        item.detail      = detail;
        item.documentation = doc;
        item.sortText    = sortPrefix + "_" + name;
        if (insertText) item.insertText = insertText;
        return item;
    }
}

module.exports = { AsmCompletionProvider };
