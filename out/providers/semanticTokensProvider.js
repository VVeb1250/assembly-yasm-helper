"use strict";
const vscode = require("vscode");
const { KEYWORD_MAP, REGISTERS, AVX_REGISTERS } = require("../data/keywords");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");

const TOKEN_TYPES    = ['macro', 'register'];
const TOKEN_MODIFIERS = [];
const LEGEND = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS);

// Fast register lookup set (all lowercase)
const REGISTER_SET = new Set([
    ...REGISTERS.map(r => r.toLowerCase()),
    ...AVX_REGISTERS.map(r => r.toLowerCase())
]);

// Word-token regex: matches identifier-like tokens in a line
const WORD_RE = /\b([A-Za-z][A-Za-z0-9]*)\b/g;

class AsmSemanticTokensProvider {

    constructor(registry) {
        this.registry = registry;
        this._emitter = new vscode.EventEmitter();
        this.onDidChangeSemanticTokens = this._emitter.event;
    }

    /** Call after every registry update to trigger re-highlight */
    fire() { this._emitter.fire(); }

    provideDocumentSemanticTokens(document) {
        const builder = new vscode.SemanticTokensBuilder(LEGEND);

        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text;
            if (!text.trim()) continue;

            const trimmed = text.trimStart();
            // skip comment-only lines and preprocessor directives
            if (trimmed.startsWith(';') || trimmed.startsWith('%')) continue;

            // strip inline comment and string literals for cleaner token scan
            const noComment = text.split(';')[0];

            // --- Macro call at instruction position (type 0 = 'macro') ---
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
                    this.registry.findMacro(key)) {
                    builder.push(i, col, word.length, 0, 0);
                }
            }

            // --- Registers anywhere on the line (type 1 = 'register') ---
            WORD_RE.lastIndex = 0;
            let m;
            while ((m = WORD_RE.exec(noComment)) !== null) {
                if (REGISTER_SET.has(m[1].toLowerCase())) {
                    builder.push(i, m.index, m[1].length, 1, 0);
                }
            }
        }

        return builder.build();
    }
}

module.exports = { AsmSemanticTokensProvider, SEMANTIC_TOKENS_LEGEND: LEGEND };
