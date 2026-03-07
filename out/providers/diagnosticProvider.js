"use strict";
const vscode = require("vscode");

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
        const seen = new Map(); // name -> first line index

        for (let i = 0; i < lines.length; i++) {
            const lineNoComment = lines[i].split(';')[0].trimEnd();
            if (!lineNoComment.trimStart().endsWith(':')) continue;

            const name = lineNoComment.trim().slice(0, -1).trim().toLowerCase();
            if (!name) continue;

            if (seen.has(name)) {
                // mark duplicate (current line)
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
        // stack-based: track open blocks
        const procStack    = [];  // proc ... endp
        const macroStack   = [];  // %macro ... %endmacro
        const ifStack      = [];  // %if/%ifdef/%ifndef ... %endif
        const tasmMacStack = [];  // macro ... endm

        for (let i = 0; i < lines.length; i++) {
            const clean = lines[i].split(';')[0].trim().toLowerCase();
            if (!clean) continue;

            const words = clean.split(/\s+/);
            const first = words[0];

            // proc / endp
            if (first === "proc")     procStack.push(i);
            if (first === "endp") {
                if (procStack.length === 0) {
                    diagnostics.push(this._makeDiagnostic(i, 0, 4, "'endp' without matching 'proc'", vscode.DiagnosticSeverity.Error));
                } else {
                    procStack.pop();
                }
            }

            // %macro / %endmacro
            if (first === "%macro")    macroStack.push(i);
            if (first === "%endmacro") {
                if (macroStack.length === 0) {
                    diagnostics.push(this._makeDiagnostic(i, 0, 8, "'%endmacro' without matching '%macro'", vscode.DiagnosticSeverity.Error));
                } else {
                    macroStack.pop();
                }
            }

            // %if / %ifdef / %ifndef / %elif / %else / %endif
            if (["%if", "%ifdef", "%ifndef"].includes(first)) ifStack.push(i);
            if (first === "%endif") {
                if (ifStack.length === 0) {
                    diagnostics.push(this._makeDiagnostic(i, 0, 6, "'%endif' without matching '%if'", vscode.DiagnosticSeverity.Error));
                } else {
                    ifStack.pop();
                }
            }

            // TASM macro / endm
            if (first === "macro")  tasmMacStack.push(i);
            if (first === "endm") {
                if (tasmMacStack.length === 0) {
                    diagnostics.push(this._makeDiagnostic(i, 0, 4, "'endm' without matching 'macro'", vscode.DiagnosticSeverity.Error));
                } else {
                    tasmMacStack.pop();
                }
            }
        }

        // ที่เหลือใน stack = ไม่มีปิด
        for (const lineIdx of procStack) {
            const name = lines[lineIdx].split(/\s+/)[1] || "unknown";
            diagnostics.push(this._makeDiagnostic(lineIdx, 0, 4, `'proc ${name}' is never closed with 'endp'`, vscode.DiagnosticSeverity.Error));
        }
        for (const lineIdx of macroStack) {
            const name = lines[lineIdx].trim().split(/\s+/)[1] || "unknown";
            diagnostics.push(this._makeDiagnostic(lineIdx, 0, 6, `'%macro ${name}' is never closed with '%endmacro'`, vscode.DiagnosticSeverity.Error));
        }
        for (const lineIdx of ifStack) {
            diagnostics.push(this._makeDiagnostic(lineIdx, 0, 3, `'%if' block is never closed with '%endif'`, vscode.DiagnosticSeverity.Error));
        }
        for (const lineIdx of tasmMacStack) {
            const name = lines[lineIdx].trim().split(/\s+/)[1] || "unknown";
            diagnostics.push(this._makeDiagnostic(lineIdx, 0, 5, `'macro ${name}' is never closed with 'endm'`, vscode.DiagnosticSeverity.Error));
        }
    }

    // ==========================================
    // Level 2: Reference
    // ==========================================
    _checkLevel2(lines, diagnostics) {
        const jumpOps = ["jmp","je","jne","jz","jnz","jg","jl","jge","jle",
                         "ja","jb","jae","jbe","jc","jnc","js","jns","jo","jno",
                         "jcxz","jecxz","jrcxz","loop","loope","loopne"];

        // รวม label และ proc ทั้งหมดที่มีอยู่
        const knownLabels = new Set([
            ...this.registry.labels.map(l => l.toLowerCase()),
            ...this.registry.procs.map(p => p.name.toLowerCase())
        ]);

        // รวม variable ทั้งหมดที่มีอยู่
        const knownVars = new Set(this.registry.vars.map(v => v.name.toLowerCase()));

        for (let i = 0; i < lines.length; i++) {
            const lineNoComment = lines[i].split(';')[0];
            const clean = lineNoComment.trim().toLowerCase();
            if (!clean) continue;

            const words = clean.split(/[\s,]+/).filter(w => w.length > 0);
            if (words.length < 2) continue;

            const first = words[0];

            // ตรวจ jump/call ชี้ไป label ที่ไม่มี
            if (jumpOps.includes(first) || first === "call") {
                const target = words[1];
                // ข้ามถ้าเป็นตัวเลข, register, หรือ memory [...]
                if (!this._isNumber(target) && !target.startsWith('[') && !target.startsWith('0x')) {
                    if (!knownLabels.has(target)) {
                        const col = lineNoComment.toLowerCase().indexOf(target, first.length);
                        diagnostics.push(this._makeDiagnostic(
                            i, col, target.length,
                            `Undefined label or procedure '${target}'`,
                            vscode.DiagnosticSeverity.Warning
                        ));
                    }
                }
            }

            // ตรวจ mov/arithmetic ที่ใช้ variable ที่ไม่มีใน .data/.bss
            const dataOps = ["mov","add","sub","cmp","and","or","xor","test","lea","movzx","movsx"];
            if (dataOps.includes(first)) {
                for (let w = 1; w < words.length; w++) {
                    const word = words[w].replace(/[\[\]]/g, ''); // strip []
                    // ข้ามถ้าเป็น register, number, size keyword, หรือ operator
                    if (this._isRegister(word) || this._isNumber(word) || this._isSizeKeyword(word) || word === '+' || word === '-' || word === '*') continue;
                    // ถ้าดูเหมือน identifier และไม่มีใน vars → warning
                    if (/^[a-z_][a-z0-9_]*$/.test(word) && !knownVars.has(word) && !knownLabels.has(word)) {
                        const col = lineNoComment.toLowerCase().indexOf(word, first.length);
                        if (col !== -1) {
                            diagnostics.push(this._makeDiagnostic(
                                i, col, word.length,
                                `'${word}' is not defined as a variable or label`,
                                vscode.DiagnosticSeverity.Warning
                            ));
                        }
                    }
                }
            }
        }
    }

    // ==========================================
    // Helpers
    // ==========================================
    _makeDiagnostic(line, col, length, message, severity) {
        const range = new vscode.Range(line, col, line, col + length);
        return new vscode.Diagnostic(range, message, severity);
    }

    _isRegister(word) {
        const regs = ["rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp",
                      "eax","ebx","ecx","edx","esi","edi","ebp","esp",
                      "ax","bx","cx","dx","si","di","bp","sp",
                      "al","bl","cl","dl","ah","bh","ch","dh",
                      "r8","r9","r10","r11","r12","r13","r14","r15",
                      "rip","eip","eflags","rflags",
                      "cs","ds","es","fs","gs","ss"];
        return regs.includes(word) || /^(xmm|ymm|zmm)\d+$/.test(word) || /^r\d+[bdw]?$/.test(word);
    }

    _isNumber(word) {
        return /^0x[0-9a-f]+$/i.test(word) || /^[0-9][0-9a-f]*(h|b|d)?$/.test(word);
    }

    _isSizeKeyword(word) {
        return ["byte","word","dword","qword","tbyte","oword","yword","zword","ptr"].includes(word);
    }

    dispose() {
        this.collection.dispose();
    }
}

module.exports = { DiagnosticProvider };