"use strict";
const vscode = require("vscode");
const { getSemanticTokens, TOKEN_TYPES, TOKEN_MODIFIERS } = require("../core/semanticEngine");

const LEGEND = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS);

class AsmSemanticTokensProvider {

    constructor(registry) {
        this.registry = registry;
        this._emitter = new vscode.EventEmitter();
        this.onDidChangeSemanticTokens = this._emitter.event;
    }

    fire() { this._emitter.fire(); }

    provideDocumentSemanticTokens(document) {
        const lines = [];
        for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);

        const builder = new vscode.SemanticTokensBuilder(LEGEND);
        for (const t of getSemanticTokens(lines, this.registry)) {
            builder.push(t.line, t.col, t.length, t.tokenTypeIndex, 0);
        }
        return builder.build();
    }
}

module.exports = { AsmSemanticTokensProvider, SEMANTIC_TOKENS_LEGEND: LEGEND };
