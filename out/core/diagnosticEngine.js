"use strict";

const { KEYWORD_DICTIONARY } = require("../data/keywords");
const { KeywordType, AllowKinds } = require("../data/enums");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");
const { OperandType } = require("../data/operandTypes");

const REG_SIZE = {
    8:   ["al","bl","cl","dl","ah","bh","ch","dh","sil","dil","bpl","spl",
           "r8b","r9b","r10b","r11b","r12b","r13b","r14b","r15b"],
    16:  ["ax","bx","cx","dx","si","di","bp","sp",
           "r8w","r9w","r10w","r11w","r12w","r13w","r14w","r15w"],
    32:  ["eax","ebx","ecx","edx","esi","edi","ebp","esp",
           "r8d","r9d","r10d","r11d","r12d","r13d","r14d","r15d"],
    64:  ["rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp",
           "r8","r9","r10","r11","r12","r13","r14","r15","rip"],
    128: [],
    256: [],
    512: [],
};
for (let i = 0; i < 16; i++) REG_SIZE[128].push(`xmm${i}`);
for (let i = 0; i < 16; i++) REG_SIZE[256].push(`ymm${i}`);
for (let i = 0; i < 32; i++) REG_SIZE[512].push(`zmm${i}`);

const REG_BITS = {};
for (const [bits, regs] of Object.entries(REG_SIZE)) {
    for (const r of regs) REG_BITS[r] = Number(bits);
}

const KEYWORD_MAP = new Map(KEYWORD_DICTIONARY.map(k => [k.name.toLowerCase(), k]));

/**
 * Analyze lines and return plain diagnostic objects.
 * @param {string[]} lines
 * @param {object} registry
 * @returns {{ line: number, startCol: number, endCol: number, message: string, severity: 'error'|'warning' }[]}
 */
function analyzeDiagnostics(lines, registry) {
    const diags = [];
    _checkLevel1(lines, diags);
    _checkLevel2(lines, diags, registry);
    _checkLevel3(lines, diags);
    return diags;
}

// ==========================================
// Level 1: Syntax
// ==========================================
function _checkLevel1(lines, diags) {
    _checkDuplicateLabels(lines, diags);
    _checkUnclosedBlocks(lines, diags);
}

function _checkDuplicateLabels(lines, diags) {
    const seen = new Map();
    for (let i = 0; i < lines.length; i++) {
        const lineNoComment = lines[i].split(';')[0].trimEnd();
        if (!lineNoComment.trimStart().endsWith(':')) continue;
        const name = lineNoComment.trim().slice(0, -1).trim().toLowerCase();
        if (!name) continue;
        if (name.startsWith('%%')) continue;
        if (name.startsWith('.'))  continue; // local labels are scoped — skip duplicate check
        if (seen.has(name)) {
            diags.push(_makeDiag(i, lines[i].indexOf(name.charAt(0)), name.length,
                `Duplicate label '${name}' (first defined at line ${seen.get(name) + 1})`,
                'error'));
        } else {
            seen.set(name, i);
        }
    }
}

function _checkUnclosedBlocks(lines, diags) {
    const procStack = [], macroStack = [], ifStack = [], tasmMacStack = [];

    for (let i = 0; i < lines.length; i++) {
        const clean = lines[i].split(';')[0].trim().toLowerCase();
        if (!clean) continue;
        const words  = clean.split(/\s+/);
        const first  = words[0];
        const second = words[1] || '';

        if (second === "proc")     procStack.push(i);
        if (first === "endp") {
            if (procStack.length === 0) diags.push(_makeDiag(i, 0, 4, "'endp' without matching 'proc'", 'error'));
            else procStack.pop();
        }
        if (first === "%macro")    macroStack.push(i);
        if (first === "%endmacro") {
            if (macroStack.length === 0) diags.push(_makeDiag(i, 0, 8, "'%endmacro' without matching '%macro'", 'error'));
            else macroStack.pop();
        }
        if (["%if","%ifdef","%ifndef"].includes(first)) ifStack.push(i);
        if (first === "%endif") {
            if (ifStack.length === 0) diags.push(_makeDiag(i, 0, 6, "'%endif' without matching '%if'", 'error'));
            else ifStack.pop();
        }
        if (second === "macro")  tasmMacStack.push(i);
        if (first === "endm") {
            if (tasmMacStack.length === 0) diags.push(_makeDiag(i, 0, 4, "'endm' without matching 'macro'", 'error'));
            else tasmMacStack.pop();
        }
    }

    for (const li of procStack)    diags.push(_makeDiag(li, 0, 4, `'proc' is never closed with 'endp'`, 'error'));
    for (const li of macroStack)   diags.push(_makeDiag(li, 0, 6, `'%macro' is never closed with '%endmacro'`, 'error'));
    for (const li of ifStack)      diags.push(_makeDiag(li, 0, 3, `'%if' block is never closed with '%endif'`, 'error'));
    for (const li of tasmMacStack) diags.push(_makeDiag(li, 0, 5, `'macro' is never closed with 'endm'`, 'error'));
}

// ==========================================
// Level 2: Reference
// ==========================================
function _checkLevel2(lines, diags, registry) {
    const jumpOps = ["jmp","je","jne","jz","jnz","jg","jl","jge","jle",
                     "ja","jb","jae","jbe","jc","jnc","js","jns","jo","jno",
                     "jcxz","jecxz","jrcxz","loop","loope","loopne"];

    const knownLabels = new Set([
        ...registry.labels.map(l => l.name.toLowerCase()),
        ...registry.procs.map(p => p.name.toLowerCase())
    ]);
    const knownVars = new Set(registry.vars.map(v => v.name.toLowerCase()));

    for (let i = 0; i < lines.length; i++) {
        const lineNoComment = lines[i].split(';')[0];
        const clean = lineNoComment.trim().toLowerCase();
        if (!clean) continue;
        const words = clean.split(/[\s,]+/).filter(w => w.length > 0);
        if (words.length < 2) continue;
        const first = words[0];

        if (jumpOps.includes(first) || first === "call") {
            const target = words[1];
            if (!_isNumber(target) && !target.startsWith('[') && !target.startsWith('0x')) {
                if (!knownLabels.has(target)) {
                    const col = lineNoComment.toLowerCase().indexOf(target, first.length);
                    diags.push(_makeDiag(i, col, target.length,
                        `Undefined label or procedure '${target}'`, 'warning'));
                }
            }
        }

        const dataOps = ["mov","add","sub","cmp","and","or","xor","test","lea","movzx","movsx"];
        if (dataOps.includes(first)) {
            for (let w = 1; w < words.length; w++) {
                const word = words[w].replace(/[\[\]]/g, '');
                if (_isRegister(word) || _isNumber(word) || _isSizeKeyword(word)) continue;
                if (/^[a-z_][a-z0-9_]*$/.test(word) && !knownVars.has(word) && !knownLabels.has(word)) {
                    const col = lineNoComment.toLowerCase().indexOf(word, first.length);
                    if (col !== -1) {
                        diags.push(_makeDiag(i, col, word.length,
                            `'${word}' is not defined as a variable or label`, 'warning'));
                    }
                }
            }
        }
    }
}

// ==========================================
// Level 3: Instruction Validation
// ==========================================
function _checkLevel3(lines, diags) {
    for (let i = 0; i < lines.length; i++) {
        const lineNoComment = lines[i].split(';')[0];
        const clean = lineNoComment.trim().toLowerCase();
        if (!clean || clean.endsWith(':')) continue;

        const spaceIdx = clean.search(/[\s\t]/);
        if (spaceIdx === -1) continue;

        const opcode = clean.substring(0, spaceIdx).trim();
        const kw = KEYWORD_MAP.get(opcode);
        if (!kw) continue;
        if (kw.type !== KeywordType.instruction) continue;

        const operandStr = clean.substring(spaceIdx).trim();
        const operands = operandStr.split(',').map(o => o.trim()).filter(o => o.length > 0);

        const sigForms = INSTRUCTION_SIGNATURES[opcode];
        const validBySig = sigForms?.some(sig => sig.length === operands.length);
        if (kw.opCount >= 0 && operands.length !== kw.opCount && !validBySig) {
            const col = lineNoComment.toLowerCase().indexOf(opcode);
            diags.push(_makeDiag(i, col, opcode.length,
                `'${opcode}' requires ${kw.opCount} operand(s), got ${operands.length}`, 'error'));
            continue;
        }

        if (kw.opCount === 1 && operands.length === 1) {
            const op = operands[0].replace(/[\[\]]/g, '').trim();
            _checkOperandType(i, lineNoComment, op, opcode, kw.allowType, diags);
        }

        if (kw.opCount === 2 && operands.length === 2) {
            _checkSizeMismatch(i, lineNoComment, opcode, operands, diags);
        }

        if (sigForms && operands.length >= 2) {
            const types = operands.map(o => _classifyOperand(o));
            const matched = sigForms.some(sig =>
                sig.length === operands.length &&
                sig.every((expected, j) => types[j] & expected)
            );
            if (!matched) {
                const col = lineNoComment.toLowerCase().indexOf(opcode);
                diags.push(_makeDiag(i, col, opcode.length,
                    `'${opcode}' has no valid form for (${types.map(t => _typeName(t)).join(', ')})`, 'warning'));
            }
        }
    }
}

function _checkOperandType(lineIdx, rawLine, operand, opcode, allowType, diags) {
    if (allowType === AllowKinds.label) {
        if (_isRegister(operand) || _isNumber(operand)) {
            const col = rawLine.toLowerCase().indexOf(operand, opcode.length);
            diags.push(_makeDiag(lineIdx, col, operand.length,
                `'${opcode}' expects a label, not '${operand}'`, 'error'));
        }
        return;
    }
    if (allowType === AllowKinds.constants) {
        if (!_isNumber(operand)) {
            const col = rawLine.toLowerCase().indexOf(operand, opcode.length);
            diags.push(_makeDiag(lineIdx, col, operand.length,
                `'${opcode}' expects a constant, not '${operand}'`, 'error'));
        }
    }
}

function _checkSizeMismatch(lineIdx, rawLine, opcode, operands, diags) {
    const sizeConvOps = ["movzx", "movsx", "movsxd"];
    if (sizeConvOps.includes(opcode)) return;

    const SIZE_KEYWORD_BITS = {
        "byte": 8, "word": 16, "dword": 32, "qword": 64,
        "tbyte": 80, "oword": 128, "yword": 256, "zword": 512
    };

    const getInfo = (op) => {
        let s = op.replace(/\[/g, ' ').replace(/\]/g, ' ').trim();
        const tokens = s.split(/\s+/).filter(t => t.length > 0);
        let sizeKeyword = null, reg = null;
        for (const t of tokens) {
            if (SIZE_KEYWORD_BITS[t] !== undefined) sizeKeyword = t;
            else if (REG_BITS[t] !== undefined) reg = t;
        }
        if (sizeKeyword) return { bits: SIZE_KEYWORD_BITS[sizeKeyword], label: sizeKeyword, token: sizeKeyword };
        if (reg)         return { bits: REG_BITS[reg], label: reg, token: reg };
        return null;
    };

    const info1 = getInfo(operands[0]);
    const info2 = getInfo(operands[1]);
    if (!info1 || !info2 || info1.bits === info2.bits) return;

    const commaIdx = rawLine.indexOf(',');
    const searchFrom = commaIdx !== -1 ? commaIdx : 0;
    const col = rawLine.toLowerCase().indexOf(info2.token, searchFrom);

    diags.push(_makeDiag(lineIdx, col, info2.token.length,
        `Size mismatch: '${info1.label}' is ${info1.bits}-bit but '${info2.label}' is ${info2.bits}-bit`, 'error'));
}

// ==========================================
// Helpers
// ==========================================
function _makeDiag(line, col, length, message, severity) {
    const startCol = Math.max(0, col);
    return { line, startCol, endCol: startCol + length, message, severity };
}

function _classifyOperand(op) {
    if (op.includes('[')) return OperandType.MEM;
    const tokens = op.split(/\s+/).filter(t => t.length > 0);
    if (tokens.some(t => _isRegister(t))) return OperandType.REG;
    if (tokens.length === 1 && _isNumber(tokens[0])) return OperandType.IMM;
    return OperandType.LABEL | OperandType.IMM;
}

function _typeName(bits) {
    if ((bits & 3) === 3) return 'r/m';
    if (bits & OperandType.REG)   return 'reg';
    if (bits & OperandType.MEM)   return 'mem';
    if (bits & OperandType.IMM)   return 'imm';
    if (bits & OperandType.LABEL) return 'label';
    return '?';
}

function _isRegister(word) {
    return word in REG_BITS ||
           /^(xmm|ymm|zmm)\d+$/.test(word) ||
           /^r\d+(b|w|d)?$/.test(word);
}

function _isNumber(word) {
    return /^0x[0-9a-f]+$/i.test(word) ||
           /^[0-9][0-9a-f]*(h|b|d)?$/i.test(word);
}

function _isSizeKeyword(word) {
    return ["byte","word","dword","qword","tbyte","oword","yword","zword","ptr","rel","near","far","short"].includes(word);
}

module.exports = { analyzeDiagnostics };
