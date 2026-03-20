"use strict";
const vscode = require("vscode");

// Matches assembly identifiers (letters, digits, _, ., $, ?)
const IDENT_RE = /\b([A-Za-z_.$?][\w.$?]*)\b/g;

class AsmReferencesProvider {
    constructor(registry) {
        this.registry = registry;
    }

    provideReferences(document, position, context) {
        const range = document.getWordRangeAtPosition(position, IDENT_RE);
        if (!range) return [];

        const word = document.getText(range);
        const key  = word.toLowerCase();

        // only user-defined symbols
        const sym = this.registry.findLabel(key) ||
                    this.registry.findVariable(key) ||
                    this.registry.findProcedure(key) ||
                    this.registry.findMacro(key);
        if (!sym) return [];

        const locations = [];
        const searchRe  = new RegExp(`\\b${_escapeRegex(word)}\\b`, 'gi');

        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text.replace(/;.*$/, ''); // strip comments
            let m;
            searchRe.lastIndex = 0;
            while ((m = searchRe.exec(text)) !== null) {
                // skip the definition line if includeDeclaration is false
                if (!context.includeDeclaration && sym.line === i) continue;
                const start = new vscode.Position(i, m.index);
                const end   = new vscode.Position(i, m.index + m[0].length);
                locations.push(new vscode.Location(document.uri, new vscode.Range(start, end)));
            }
        }

        return locations;
    }
}

function _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { AsmReferencesProvider };
