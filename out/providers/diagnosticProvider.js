"use strict";
const vscode = require("vscode");
const { KEYWORD_DICONTARY } = require("../data/keywords");
const { KeywordType, AllowKinds } = require("../data/enums");

// Register size groups for size mismatch detection
const REG_SIZE = {
    8:  ["al","bl","cl","dl","ah","bh","ch","dh","sil","dil","bpl","spl",
          "r8b","r9b","r10b","r11b","r12b","r13b","r14b","r15b"],
    16: ["ax","bx","cx","dx","si","di","bp","sp",
          "r8w","r9w","r10w","r11w","r12w","r13w","r14w","r15w"],
    32: ["eax","ebx","ecx","edx","esi","edi","ebp","esp",
          "r8d","r9d","r10d","r11d","r12d","r13d","r14d","r15d"],
    64: ["rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp",
          "r8","r9","r10","r11","r12","r13","r14","r15","rip"],
    128: [], // xmm (fill dynamically)
    256: [], // ymm
    512: [], // zmm
};
// fill xmm/ymm/zmm dynamically
for (let i = 0; i < 16; i++) REG_SIZE[128].push(`xmm${i}`);
for (let i = 0; i < 16; i++) REG_SIZE[256].push(`ymm${i}`);
for (let i = 0; i < 32; i++) REG_SIZE[512].push(`zmm${i}`);

// flat map: register name → bit size
const REG_BITS = {};
for (const [bits, regs] of Object.entries(REG_SIZE)) {
    for (const r of regs) REG_BITS[r] = Number(bits);
}

// keyword lookup map (name → KeywordDef)
const KEYWORD_MAP = new Map(KEYWORD_DICONTARY.map(k => [k.name.toLowerCase(), k]));

class DiagnosticProvider {
    constructor(registry) {
        this.registry = registry;
        this.collection = vscode.languages.createDiagnosticCollection("assembly");
    }

    analyze(document) {
        const diagnostics = [];
        const lines = [];
        for (let i = 0; i < document.lineCount; i++) {
            lines.push(document.lineAt(i).text);
        }

        this._checkLevel1(lines, diagnostics);
        this._checkLevel2(lines, diagnostics);
        this._checkLevel3(lines, diagnostics);

        this.collection.set(document.uri, diagnostics);
    }

    // ==========================================
    // Level 1: Syntax
    // ==========================================
    _checkLevel1(lines, diagnostics) {
        this._checkDuplicateLabels(lines, diagnostics);
        this._checkUnclosedBlocks(lines, diagnostics);
    }

    _checkDuplicateLabels(lines, diagnostics) {
        const seen = new Map();
        for (let i = 0; i < lines.length; i++) {
            const lineNoComment = lines[i].split(';')[0].trimEnd();
            if (!lineNoComment.trimStart().endsWith(':')) continue;
            const name = lineNoComment.trim().slice(0, -1).trim().toLowerCase();
            if (!name) continue;
            if (seen.has(name)) {
                diagnostics.push(this._makeDiagnostic(
                    i, lines[i].indexOf(name.charAt(0)), name.length,
                    `Duplicate label '${name}' (first defined at line ${seen.get(name) + 1})`,
                    vscode.DiagnosticSeverity.Error
                ));
            } else {
                seen.set(name, i);
            }
        }
    }

    _checkUnclosedBlocks(lines, diagnostics) {
        const procStack = [], macroStack = [], ifStack = [], tasmMacStack = [];

        for (let i = 0; i < lines.length; i++) {
            const clean = lines[i].split(';')[0].trim().toLowerCase();
            if (!clean) continue;
            const first = clean.split(/\s+/)[0];

            if (first === "proc")      procStack.push(i);
            if (first === "endp") {
                if (procStack.length === 0) diagnostics.push(this._makeDiagnostic(i, 0, 4, "'endp' without matching 'proc'", vscode.DiagnosticSeverity.Error));
                else procStack.pop();
            }
            if (first === "%macro")    macroStack.push(i);
            if (first === "%endmacro") {
                if (macroStack.length === 0) diagnostics.push(this._makeDiagnostic(i, 0, 8, "'%endmacro' without matching '%macro'", vscode.DiagnosticSeverity.Error));
                else macroStack.pop();
            }
            if (["%if","%ifdef","%ifndef"].includes(first)) ifStack.push(i);
            if (first === "%endif") {
                if (ifStack.length === 0) diagnostics.push(this._makeDiagnostic(i, 0, 6, "'%endif' without matching '%if'", vscode.DiagnosticSeverity.Error));
                else ifStack.pop();
            }
            if (first === "macro")  tasmMacStack.push(i);
            if (first === "endm") {
                if (tasmMacStack.length === 0) diagnostics.push(this._makeDiagnostic(i, 0, 4, "'endm' without matching 'macro'", vscode.DiagnosticSeverity.Error));
                else tasmMacStack.pop();
            }
        }

        for (const li of procStack)    diagnostics.push(this._makeDiagnostic(li, 0, 4, `'proc' is never closed with 'endp'`, vscode.DiagnosticSeverity.Error));
        for (const li of macroStack)   diagnostics.push(this._makeDiagnostic(li, 0, 6, `'%macro' is never closed with '%endmacro'`, vscode.DiagnosticSeverity.Error));
        for (const li of ifStack)      diagnostics.push(this._makeDiagnostic(li, 0, 3, `'%if' block is never closed with '%endif'`, vscode.DiagnosticSeverity.Error));
        for (const li of tasmMacStack) diagnostics.push(this._makeDiagnostic(li, 0, 5, `'macro' is never closed with 'endm'`, vscode.DiagnosticSeverity.Error));
    }

    // ==========================================
    // Level 2: Reference
    // ==========================================
    _checkLevel2(lines, diagnostics) {
        const jumpOps = ["jmp","je","jne","jz","jnz","jg","jl","jge","jle",
                         "ja","jb","jae","jbe","jc","jnc","js","jns","jo","jno",
                         "jcxz","jecxz","jrcxz","loop","loope","loopne"];

        const knownLabels = new Set([
            ...this.registry.labels.map(l => l.toLowerCase()),
            ...this.registry.procs.map(p => p.name.toLowerCase())
        ]);
        const knownVars = new Set(this.registry.vars.map(v => v.name.toLowerCase()));

        for (let i = 0; i < lines.length; i++) {
            const lineNoComment = lines[i].split(';')[0];
            const clean = lineNoComment.trim().toLowerCase();
            if (!clean) continue;
            const words = clean.split(/[\s,]+/).filter(w => w.length > 0);
            if (words.length < 2) continue;
            const first = words[0];

            if (jumpOps.includes(first) || first === "call") {
                const target = words[1];
                if (!this._isNumber(target) && !target.startsWith('[') && !target.startsWith('0x')) {
                    if (!knownLabels.has(target)) {
                        const col = lineNoComment.toLowerCase().indexOf(target, first.length);
                        diagnostics.push(this._makeDiagnostic(i, col, target.length,
                            `Undefined label or procedure '${target}'`,
                            vscode.DiagnosticSeverity.Warning));
                    }
                }
            }

            const dataOps = ["mov","add","sub","cmp","and","or","xor","test","lea","movzx","movsx"];
            if (dataOps.includes(first)) {
                for (let w = 1; w < words.length; w++) {
                    const word = words[w].replace(/[\[\]]/g, '');
                    if (this._isRegister(word) || this._isNumber(word) || this._isSizeKeyword(word)) continue;
                    if (/^[a-z_][a-z0-9_]*$/.test(word) && !knownVars.has(word) && !knownLabels.has(word)) {
                        const col = lineNoComment.toLowerCase().indexOf(word, first.length);
                        if (col !== -1) {
                            diagnostics.push(this._makeDiagnostic(i, col, word.length,
                                `'${word}' is not defined as a variable or label`,
                                vscode.DiagnosticSeverity.Warning));
                        }
                    }
                }
            }
        }
    }

    // ==========================================
    // Level 3: Instruction Validation
    // ==========================================
    _checkLevel3(lines, diagnostics) {
        for (let i = 0; i < lines.length; i++) {
            const lineNoComment = lines[i].split(';')[0];
            const clean = lineNoComment.trim().toLowerCase();
            if (!clean || clean.endsWith(':')) continue;

            // parse: split by whitespace for opcode, then by comma for operands
            const spaceIdx = clean.search(/[\s\t]/);
            if (spaceIdx === -1) continue; // no operands

            const opcode = clean.substring(0, spaceIdx).trim();
            const kw = KEYWORD_MAP.get(opcode);
            if (!kw) continue; // ไม่รู้จัก opcode ข้ามไป

            // เช็ค operand count เฉพาะ instruction เท่านั้น
            // savedWord, precompiled, memoryAllocation มี syntax ต่างกันไป
            if (kw.type !== KeywordType.instruction) continue;

            // parse operands (split by comma, strip brackets/size keywords)
            const operandStr = clean.substring(spaceIdx).trim();
            const operands = operandStr
                .split(',')
                .map(o => o.trim())
                .filter(o => o.length > 0);

            // --- Check 1: operand count ---
            if (kw.opCount >= 0 && operands.length !== kw.opCount) {
                const col = lineNoComment.toLowerCase().indexOf(opcode);
                diagnostics.push(this._makeDiagnostic(i, col, opcode.length,
                    `'${opcode}' requires ${kw.opCount} operand(s), got ${operands.length}`,
                    vscode.DiagnosticSeverity.Error));
                continue; // ไม่ต้องเช็คต่อถ้า count ผิดแล้ว
            }

            // --- Check 2: operand type ---
            if (kw.opCount === 1 && operands.length === 1) {
                const op = operands[0].replace(/[\[\]]/g, '').trim();
                this._checkOperandType(i, lineNoComment, op, opcode, kw.allowType, diagnostics);
            }

            // --- Check 3: size mismatch (2-operand instructions) ---
            if (kw.opCount === 2 && operands.length === 2) {
                this._checkSizeMismatch(i, lineNoComment, opcode, operands, diagnostics);
            }
        }
    }

    _checkOperandType(lineIdx, rawLine, operand, opcode, allowType, diagnostics) {
        const knownLabels = new Set([
            ...this.registry.labels.map(l => l.toLowerCase()),
            ...this.registry.procs.map(p => p.name.toLowerCase())
        ]);

        // AllowKinds.label = 8 → ต้องเป็น label เท่านั้น
        if (allowType === AllowKinds.label) {
            if (this._isRegister(operand) || this._isNumber(operand)) {
                const col = rawLine.toLowerCase().indexOf(operand, opcode.length);
                diagnostics.push(this._makeDiagnostic(lineIdx, col, operand.length,
                    `'${opcode}' expects a label, not '${operand}'`,
                    vscode.DiagnosticSeverity.Error));
            }
            return;
        }

        // AllowKinds.constants = 2 → ต้องเป็นตัวเลขเท่านั้น
        if (allowType === AllowKinds.constants) {
            if (!this._isNumber(operand)) {
                const col = rawLine.toLowerCase().indexOf(operand, opcode.length);
                diagnostics.push(this._makeDiagnostic(lineIdx, col, operand.length,
                    `'${opcode}' expects a constant, not '${operand}'`,
                    vscode.DiagnosticSeverity.Error));
            }
        }
    }

    _checkSizeMismatch(lineIdx, rawLine, opcode, operands, diagnostics) {
        // ข้าม size conversion instructions ที่ตั้งใจ mix size
        const sizeConvOps = ["movzx", "movsx", "movsxd"];
        if (sizeConvOps.includes(opcode)) return;

        // size T → bits
        const SIZE_KEYWORD_BITS = {
            "byte": 8, "word": 16, "dword": 32, "qword": 64,
            "tbyte": 80, "oword": 128, "yword": 256, "zword": 512
        };

        const getInfo = (op) => {
            // strip brackets: "dword[var1]" → "dword var1", "[rax]" → "rax"
            let s = op.replace(/\[/g, ' ').replace(/\]/g, ' ').trim();

            // แยก tokens
            const tokens = s.split(/\s+/).filter(t => t.length > 0);

            let sizeKeyword = null;
            let reg = null;

            for (const t of tokens) {
                if (SIZE_KEYWORD_BITS[t] !== undefined) sizeKeyword = t;
                else if (REG_BITS[t] !== undefined)    reg = t;
            }

            // ถ้ามี size keyword → bits มาจาก keyword
            if (sizeKeyword) return { bits: SIZE_KEYWORD_BITS[sizeKeyword], label: sizeKeyword, token: sizeKeyword };
            // ถ้ามี register → bits มาจาก register
            if (reg)         return { bits: REG_BITS[reg], label: reg, token: reg };
            return null;
        };

        const info1 = getInfo(operands[0]);
        const info2 = getInfo(operands[1]);

        if (!info1 || !info2) return;
        if (info1.bits === info2.bits) return;

        // หา column ของ operand ที่ 2
        const commaIdx = rawLine.indexOf(',');
        const searchFrom = commaIdx !== -1 ? commaIdx : 0;
        const col = rawLine.toLowerCase().indexOf(info2.token, searchFrom);

        diagnostics.push(this._makeDiagnostic(lineIdx, col, info2.token.length,
            `Size mismatch: '${info1.label}' is ${info1.bits}-bit but '${info2.label}' is ${info2.bits}-bit`,
            vscode.DiagnosticSeverity.Error));
    }

    // ==========================================
    // Helpers
    // ==========================================
    _makeDiagnostic(line, col, length, message, severity) {
        const safeCol = Math.max(0, col);
        const range = new vscode.Range(line, safeCol, line, safeCol + length);
        return new vscode.Diagnostic(range, message, severity);
    }

    _isRegister(word) {
        return word in REG_BITS ||
               /^(xmm|ymm|zmm)\d+$/.test(word) ||
               /^r\d+(b|w|d)?$/.test(word);
    }

    _isNumber(word) {
        return /^0x[0-9a-f]+$/i.test(word) ||
               /^[0-9][0-9a-f]*(h|b|d)?$/i.test(word);
    }

    _isSizeKeyword(word) {
        return ["byte","word","dword","qword","tbyte","oword","yword","zword","ptr"].includes(word);
    }

    dispose() {
        this.collection.dispose();
    }
}

module.exports = { DiagnosticProvider };