"use strict";

const { KEYWORD_MAP, REGISTERS, AVX_REGISTERS } = require("../data/keywords");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");

const TOKEN_TYPES     = ['macro', 'register'];
const TOKEN_MODIFIERS = [];

const REGISTER_SET = new Set([
    ...REGISTERS.map(r => r.toLowerCase()),
    ...AVX_REGISTERS.map(r => r.toLowerCase())
]);

const WORD_RE = /\b([A-Za-z][A-Za-z0-9]*)\b/g;

/**
 * Compute semantic tokens for document lines.
 * @param {string[]} lines
 * @param {object} registry
 * @returns {{ line: number, col: number, length: number, tokenTypeIndex: number }[]}
 */
function getSemanticTokens(lines, registry) {
    const tokens = [];

    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        if (!text.trim()) continue;

        const trimmed = text.trimStart();
        if (trimmed.startsWith(';') || trimmed.startsWith('%')) continue;

        const noComment = text.split(';')[0];

        // Macro call at instruction position (tokenTypeIndex 0 = 'macro')
        const firstToken = noComment.match(/^(\s*)([A-Za-z_.$?][A-Za-z0-9_.$?]*)/);
        if (firstToken) {
            const col  = firstToken[1].length;
            const word = firstToken[2];
            const key  = word.toLowerCase();
            const rest = noComment.slice(col + word.length).trimStart();

            if (!rest.startsWith(':') &&
                !KEYWORD_MAP.has(key) &&
                !INSTRUCTION_SIGNATURES[key] &&
                !REGISTER_SET.has(key) &&
                registry.findMacro(key)) {
                tokens.push({ line: i, col, length: word.length, tokenTypeIndex: 0 });
            }
        }

        // Registers anywhere on the line (tokenTypeIndex 1 = 'register')
        WORD_RE.lastIndex = 0;
        let m;
        while ((m = WORD_RE.exec(noComment)) !== null) {
            if (REGISTER_SET.has(m[1].toLowerCase())) {
                tokens.push({ line: i, col: m.index, length: m[1].length, tokenTypeIndex: 1 });
            }
        }
    }

    return tokens;
}

module.exports = { getSemanticTokens, TOKEN_TYPES, TOKEN_MODIFIERS };
