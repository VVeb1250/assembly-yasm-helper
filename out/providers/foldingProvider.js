"use strict";
const vscode = require("vscode");

const PROC_START  = /^\s*[A-Za-z_.$?][\w.$?]*\s+proc\b/i;
const PROC_END    = /^\s*endp\s*(?:;.*)?$/i;
const MACRO_START = /^\s*%macro\b/i;
const MACRO_END   = /^\s*%endmacro\s*(?:;.*)?$/i;
const STRUC_START = /^\s*[A-Za-z_.$?][\w.$?]*\s+struc\b/i;
const STRUC_END   = /^\s*ends\s*(?:;.*)?$/i;
const SECTION_RE  = /^\s*(section|segment)\b/i;

class AsmFoldingProvider {
    provideFoldingRanges(document) {
        const ranges = [];
        const count  = document.lineCount;
        const lines  = [];
        for (let i = 0; i < count; i++) lines.push(document.lineAt(i).text);

        const procStack  = [];
        const macroStack = [];
        const strucStack = [];
        let   sectionStart = -1;

        for (let i = 0; i < count; i++) {
            const line = lines[i];

            if (SECTION_RE.test(line)) {
                // close previous section up to last non-empty line before this one
                if (sectionStart >= 0) {
                    let end = i - 1;
                    while (end > sectionStart && lines[end].trim() === '') end--;
                    if (end > sectionStart)
                        ranges.push(new vscode.FoldingRange(sectionStart, end, vscode.FoldingRangeKind.Region));
                }
                sectionStart = i;
                continue;
            }

            if (PROC_START.test(line))  { procStack.push(i);  continue; }
            if (PROC_END.test(line)  && procStack.length)  { const s = procStack.pop();  if (i > s) ranges.push(new vscode.FoldingRange(s, i)); continue; }
            if (MACRO_START.test(line)) { macroStack.push(i); continue; }
            if (MACRO_END.test(line) && macroStack.length) { const s = macroStack.pop(); if (i > s) ranges.push(new vscode.FoldingRange(s, i)); continue; }
            if (STRUC_START.test(line)) { strucStack.push(i); continue; }
            if (STRUC_END.test(line) && strucStack.length)  { const s = strucStack.pop();  if (i > s) ranges.push(new vscode.FoldingRange(s, i)); continue; }
        }

        // close last section
        if (sectionStart >= 0) {
            let end = count - 1;
            while (end > sectionStart && lines[end].trim() === '') end--;
            if (end > sectionStart)
                ranges.push(new vscode.FoldingRange(sectionStart, end, vscode.FoldingRangeKind.Region));
        }

        return ranges;
    }
}

module.exports = { AsmFoldingProvider };
