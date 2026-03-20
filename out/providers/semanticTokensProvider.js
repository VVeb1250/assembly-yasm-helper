"use strict";
const vscode = require("vscode");
const { KEYWORD_MAP } = require("../data/keywords");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");

const TOKEN_TYPES    = ['macro'];
const TOKEN_MODIFIERS = [];
const LEGEND = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS);

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

            // strip inline comment
            const noComment = text.split(';')[0];

            // match first identifier at instruction position (after optional indent)
            const m = noComment.match(/^(\s*)([A-Za-z_.$?][A-Za-z0-9_.$?]*)/);
            if (!m) continue;

            const col  = m[1].length;
            const word = m[2];
            const key  = word.toLowerCase();

            // skip label definitions (word followed by colon)
            const rest = noComment.slice(col + word.length).trimStart();
            if (rest.startsWith(':')) continue;

            // skip known built-in keywords and instructions
            if (KEYWORD_MAP.has(key) || INSTRUCTION_SIGNATURES[key]) continue;

            // emit token if this matches a user-defined macro
            if (this.registry.findMacro(key)) {
                builder.push(i, col, word.length, 0, 0); // type 0 = 'macro'
            }
        }

        return builder.build();
    }
}

module.exports = { AsmSemanticTokensProvider, SEMANTIC_TOKENS_LEGEND: LEGEND };
