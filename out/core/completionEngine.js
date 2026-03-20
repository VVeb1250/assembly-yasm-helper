"use strict";

const { Utils } = require("../utils");
const { KeywordType } = require("../data/enums");
const { KEYWORD_MAP, REGISTERS, AVX_REGISTERS, PREPROCESSOR } = require("../data/keywords");
const { OperandType } = require("../data/operandTypes");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");
const { MemoryAddressParser } = require("../engine/memoryAddressParser");

const MEM_DIRECTIVES    = ['db','dw','dd','dq','dt','resb','resw','resd','resq','equ'];
const INSTRUCTION_TYPES = new Set([KeywordType.instruction, KeywordType.memoryAllocation, KeywordType.precompiled]);
const SIZE_KEYWORDS     = ["byte","word","dword","qword","tword","oword","yword","zword"];
const KEYWORD_LIST      = Array.from(KEYWORD_MAP.values());

/**
 * Get completion items for a given context.
 * @param {{ line: string, lineIdx: number, lines: string[] }} ctx
 * @param {object} registry
 * @returns {{ label: string, kindType: number, detail: string, doc: string, sortText: string, insertText?: string }[]}
 */
function getCompletionItems(ctx, registry) {
    const { line, lineIdx, lines } = ctx;
    const items = [];

    if (_isInComment(line, line.length)) return items;
    if (_isInString(line))               return items;

    const trimmed         = line.trimStart();
    const isRootLevel     = line.length === trimmed.length;
    const words           = trimmed.length > 0 ? trimmed.split(/\s+/).map(w => w.toLowerCase()) : [];
    const isTypingOperand = words.length > 1 || (words.length === 1 && /\s$/.test(line));

    if (trimmed.startsWith('%'))
        return _completePreprocessor(lines, lineIdx, registry);

    if (!isTypingOperand)
        _addRootLevelItems(isRootLevel, items);

    if (words[0] === "section" && isTypingOperand)
        return _completeSection();

    if (_isInsideBracket(line))
        return _completeBracketMemory(line, registry);

    if (isTypingOperand)
        return _completeOperands(words, line, registry, items);

    if (trimmed.length > 0)
        _completeInstructions(words, registry, items);

    return _deduplicate(items);
}

// -------------------------------------------------------
// Guards
// -------------------------------------------------------

function _isInComment(line, character) {
    const idx = line.indexOf(';');
    return idx !== -1 && idx < character;
}

function _isInString(line) {
    const quotes = line.match(/['"]/g);
    return !!(quotes && quotes.length % 2 !== 0);
}

function _isInsideBracket(line) {
    return line.lastIndexOf("[") > line.lastIndexOf("]");
}

// -------------------------------------------------------
// Completion sections
// -------------------------------------------------------

function _completePreprocessor(lines, lineIdx, registry) {
    const items = [];
    for (const p of PREPROCESSOR)
        items.push(_makeItem(p.name, KeywordType.precompiled, p.detail, p.doc, null, "01"));
    for (const m of registry.macros)
        items.push(_makeItem(m.name, KeywordType.macro, "(Macro)", '', null, "05"));

    const argCount = _getMacroArgCount(lines, lineIdx);
    if (argCount > 0) {
        for (let i = 1; i <= argCount; i++)
            items.push(_makeItem(`%${i}`, KeywordType.constant, `(Macro arg ${i})`, '', null, "01"));
    }
    return items;
}

function _getMacroArgCount(lines, lineIdx) {
    for (let i = lineIdx - 1; i >= 0; i--) {
        const raw = lines[i].trim().toLowerCase();
        if (raw.startsWith('%endmacro')) return 0;
        if (raw.startsWith('%macro')) {
            const parts = raw.split(/\s+/);
            const n = parseInt(parts[2], 10);
            return isNaN(n) ? 0 : n;
        }
    }
    return 0;
}

function _addRootLevelItems(isRootLevel, items) {
    if (!isRootLevel) return;
    for (const sec of ["section .data", "section .text", "section .bss"])
        items.push(_makeItem(sec, KeywordType.savedWord));
    items.push(_makeItem("global", KeywordType.savedWord));
    items.push(_makeItem("extern", KeywordType.savedWord));
}

function _completeSection() {
    const items = [];
    for (const sec of ["data", "text", "bss"])
        items.push(_makeItem("." + sec, KeywordType.savedWord));
    return items;
}

function _completeBracketMemory(line, registry) {
    const items = [];
    const expr  = line.slice(line.lastIndexOf("[") + 1);
    const state = MemoryAddressParser.parse(expr);

    switch (state) {
        case "BASE":
            for (const v of registry.vars)
                items.push(_makeItem(v.name, KeywordType.variable, '', '', null, "01"));
            for (const r of REGISTERS)
                items.push(_makeItem(r, KeywordType.register, '', '', null, "02"));
            break;
        case "BASE_DONE":
            items.push(_makeItem("+", KeywordType.operator, "(Offset)"));
            break;
        case "INDEX":
            for (const r of REGISTERS)
                items.push(_makeItem(r, KeywordType.register));
            break;
        case "INDEX_DONE":
            items.push(_makeItem("*", KeywordType.operator, "(Scale)"));
            break;
        case "SCALE_INPUT":
            for (const s of ["1","2","4","8"])
                items.push(_makeItem(s, KeywordType.constant, "(Scale)"));
            break;
    }
    return items;
}

function _completeOperands(words, line, registry, items) {
    const firstWord = words[0].toLowerCase();

    if (!INSTRUCTION_SIGNATURES[firstWord]) {
        if (registry.findMacro(firstWord))
            return _completeMacroOperands(registry);
        return _completeMemoryDirectives(words);
    }

    const allowed = getAllowedOperandTypes(firstWord, getOperandIndex(line));
    if (allowed === undefined) return items;

    if (allowed & OperandType.MEM) {
        for (const s of SIZE_KEYWORDS)
            items.push(_makeItem(s, KeywordType.size, "(Size)", '', null, "01"));
        for (const v of registry.vars)
            items.push(_makeItem(v.name, KeywordType.variable, '', '', null, "02"));
    }
    if (allowed & OperandType.REG) {
        REGISTERS.forEach(r     => items.push(_makeItem(r, KeywordType.register, '', '', null, _regPrefix(r))));
        AVX_REGISTERS.forEach(r => items.push(_makeItem(r, KeywordType.register, '', '', null, "05")));
    }
    if (allowed & OperandType.IMM) {
        items.push(_makeItem("0", KeywordType.constant, "(Immediate)", '', null, "04"));
        for (const d of registry.defines || [])
            items.push(_makeItem(d, KeywordType.constant, "(%define)", '', null, "04"));
    }
    if (allowed & OperandType.LABEL) {
        const labelPrefix = (allowed === OperandType.LABEL) ? "01" : "02";
        registry.labels.forEach(l => items.push(_makeItem(l.name, KeywordType.label, '', '', null, labelPrefix)));
        registry.procs.forEach(p  => items.push(_makeItem(p.name, KeywordType.method, '', '', null, labelPrefix)));
    }
    return items;
}

function _completeMacroOperands(registry) {
    const items = [];
    for (const s of SIZE_KEYWORDS)
        items.push(_makeItem(s, KeywordType.size, "(Size)", '', null, "01"));
    for (const v of registry.vars)
        items.push(_makeItem(v.name, KeywordType.variable, '', '', null, "02"));
    REGISTERS.forEach(r     => items.push(_makeItem(r, KeywordType.register, '', '', null, _regPrefix(r))));
    AVX_REGISTERS.forEach(r => items.push(_makeItem(r, KeywordType.register, '', '', null, "05")));
    items.push(_makeItem("0", KeywordType.constant, "(Immediate)", '', null, "04"));
    return items;
}

function _completeMemoryDirectives(words) {
    const items = [];
    const secondWord = words.filter(w => w.length > 0)[1] || '';
    if (!MEM_DIRECTIVES.includes(secondWord)) {
        for (const d of MEM_DIRECTIVES) {
            const kw = KEYWORD_MAP.get(d);
            items.push(_makeItem(d, KeywordType.memoryAllocation, kw ? kw.def : '(Memory)'));
        }
    }
    return items;
}

function _completeInstructions(words, registry, items) {
    const partial = (words[0] || '').toLowerCase();
    for (const k of KEYWORD_LIST) {
        if (INSTRUCTION_TYPES.has(k.type) && k.name.toLowerCase().startsWith(partial))
            items.push(_makeItem(k.name, k.type, Utils.getType(k.type), k.def));
    }
    for (const m of registry.macros) {
        if (m.name.toLowerCase().startsWith(partial))
            items.push(_makeItem(m.name, KeywordType.macro, "(Macro)", m.doc || '', null, "01"));
    }
}

function _deduplicate(items) {
    const seen = new Set();
    return items.filter(item => {
        if (seen.has(item.label)) return false;
        seen.add(item.label);
        return true;
    });
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function getOperandIndex(line) {
    return line.split(";")[0].split(",").length - 1;
}

function getAllowedOperandTypes(instruction, operandIndex) {
    const sigs = INSTRUCTION_SIGNATURES[instruction];
    if (!sigs) return null;
    let types = 0, found = false;
    for (const sig of sigs) {
        if (sig.length > operandIndex) { types |= sig[operandIndex]; found = true; }
    }
    return found ? types : undefined;
}

function _regPrefix(reg) {
    const r = reg.toLowerCase();
    if (/^(xmm|ymm|zmm)\d+$/.test(r) || /^k\d+$/.test(r)) return "05";
    if (/^(r(ax|bx|cx|dx|si|di|bp|sp)|r\d+)$/.test(r))    return "03";
    if (/^(e(ax|bx|cx|dx|si|di|bp|sp)|r\d+d)$/.test(r))   return "03";
    return "04";
}

function _makeItem(label, kindType, detail = '', doc = "", insertText = null, sortPrefix = "02") {
    return { label, kindType, detail, doc, sortText: sortPrefix + "_" + label, insertText };
}

module.exports = { getCompletionItems, getAllowedOperandTypes, getOperandIndex };
