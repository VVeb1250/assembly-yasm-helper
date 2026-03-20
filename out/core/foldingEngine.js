"use strict";

const PROC_START  = /^\s*[A-Za-z_.$?][\w.$?]*\s+proc\b/i;
const PROC_END    = /^\s*endp\s*(?:;.*)?$/i;
const MACRO_START = /^\s*%macro\b/i;
const MACRO_END   = /^\s*%endmacro\s*(?:;.*)?$/i;
const STRUC_START = /^\s*[A-Za-z_.$?][\w.$?]*\s+struc\b/i;
const STRUC_END   = /^\s*ends\s*(?:;.*)?$/i;
const SECTION_RE  = /^\s*(section|segment)\b/i;

/**
 * Compute folding ranges for document lines.
 * @param {string[]} lines
 * @returns {{ start: number, end: number, kind: 'region'|null }[]}
 */
function getFoldingRanges(lines) {
    const ranges = [];
    const count  = lines.length;

    const procStack  = [];
    const macroStack = [];
    const strucStack = [];
    let   sectionStart = -1;

    for (let i = 0; i < count; i++) {
        const line = lines[i];

        if (SECTION_RE.test(line)) {
            if (sectionStart >= 0) {
                let end = i - 1;
                while (end > sectionStart && lines[end].trim() === '') end--;
                if (end > sectionStart) ranges.push({ start: sectionStart, end, kind: 'region' });
            }
            sectionStart = i;
            continue;
        }

        if (PROC_START.test(line))  { procStack.push(i);  continue; }
        if (PROC_END.test(line)  && procStack.length)  { const s = procStack.pop();  if (i > s) ranges.push({ start: s, end: i, kind: null }); continue; }
        if (MACRO_START.test(line)) { macroStack.push(i); continue; }
        if (MACRO_END.test(line) && macroStack.length) { const s = macroStack.pop(); if (i > s) ranges.push({ start: s, end: i, kind: null }); continue; }
        if (STRUC_START.test(line)) { strucStack.push(i); continue; }
        if (STRUC_END.test(line) && strucStack.length)  { const s = strucStack.pop();  if (i > s) ranges.push({ start: s, end: i, kind: null }); continue; }
    }

    if (sectionStart >= 0) {
        let end = count - 1;
        while (end > sectionStart && lines[end].trim() === '') end--;
        if (end > sectionStart) ranges.push({ start: sectionStart, end, kind: 'region' });
    }

    return ranges;
}

module.exports = { getFoldingRanges };
