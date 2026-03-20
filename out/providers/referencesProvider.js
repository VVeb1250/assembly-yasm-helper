"use strict";
const vscode = require("vscode");
const { findReferences } = require("../core/referencesEngine");

const IDENT_RE = /\b([A-Za-z_.$?][\w.$?]*)\b/g;

class AsmReferencesProvider {
    constructor(registry) {
        this.registry = registry;
    }

    provideReferences(document, position, context) {
        const range = document.getWordRangeAtPosition(position, IDENT_RE);
        if (!range) return [];

        const word  = document.getText(range);
        const lines = [];
        for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);

        return findReferences(word, lines, this.registry, context.includeDeclaration)
            .map(r => new vscode.Location(
                document.uri,
                new vscode.Range(r.line, r.startCol, r.line, r.endCol)
            ));
    }
}

module.exports = { AsmReferencesProvider };
