"use strict";
const vscode = require("vscode");

class AsmDocumentSymbolProvider {
    constructor(registry) {
        this.registry = registry;
    }

    provideDocumentSymbols(document, token) {
        if (!vscode.workspace.getConfiguration('assembly').get('enableDocumentSymbols')) return [];

        const symbols = [];

        for (const proc of this.registry.procs) {
            if (proc.line === undefined) continue;
            const range = new vscode.Range(proc.line, 0, proc.line, 0);
            symbols.push(new vscode.DocumentSymbol(
                proc.name,
                '(Procedure)',
                vscode.SymbolKind.Function,
                range,
                range
            ));
        }

        for (const v of this.registry.vars) {
            if (v.line === undefined) continue;
            const range = new vscode.Range(v.line, 0, v.line, 0);
            symbols.push(new vscode.DocumentSymbol(
                v.name,
                v.type + (v.section ? ' [' + v.section + ']' : ''),
                vscode.SymbolKind.Variable,
                range,
                range
            ));
        }

        for (const label of this.registry.labels) {
            if (label.line === undefined) continue;
            const range = new vscode.Range(label.line, 0, label.line, 0);
            symbols.push(new vscode.DocumentSymbol(
                label.name,
                '(Label)',
                vscode.SymbolKind.Key,
                range,
                range
            ));
        }

        return symbols;
    }
}

module.exports = { AsmDocumentSymbolProvider };
