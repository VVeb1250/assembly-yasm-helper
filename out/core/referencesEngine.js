"use strict";

/**
 * Find all references to a symbol in document lines.
 * @param {string} word
 * @param {string[]} lines
 * @param {object} registry
 * @param {boolean} includeDeclaration
 * @returns {{ line: number, startCol: number, endCol: number }[]}
 */
function findReferences(word, lines, registry, includeDeclaration) {
    const key = word.toLowerCase();
    const sym = registry.findLabel(key) ||
                registry.findVariable(key) ||
                registry.findProcedure(key) ||
                registry.findMacro(key);
    if (!sym) return [];

    const refs     = [];
    const searchRe = new RegExp(`\\b${_escapeRegex(word)}\\b`, 'gi');

    for (let i = 0; i < lines.length; i++) {
        const text = lines[i].replace(/;.*$/, '');
        let m;
        searchRe.lastIndex = 0;
        while ((m = searchRe.exec(text)) !== null) {
            if (!includeDeclaration && sym.line === i) continue;
            refs.push({ line: i, startCol: m.index, endCol: m.index + m[0].length });
        }
    }

    return refs;
}

function _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { findReferences };
