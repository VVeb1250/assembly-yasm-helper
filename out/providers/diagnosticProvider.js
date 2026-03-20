"use strict";
const vscode = require("vscode");
const { analyzeDiagnostics } = require("../core/diagnosticEngine");

class DiagnosticProvider {
    constructor(registry) {
        this.registry = registry;
        this.collection = vscode.languages.createDiagnosticCollection("assembly");
    }

    analyze(document) {
        const lines = [];
        for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);

        const plain = analyzeDiagnostics(lines, this.registry);
        const diagnostics = plain.map(d => {
            const range = new vscode.Range(d.line, d.startCol, d.line, d.endCol);
            const sev   = d.severity === 'error'
                ? vscode.DiagnosticSeverity.Error
                : vscode.DiagnosticSeverity.Warning;
            return new vscode.Diagnostic(range, d.message, sev);
        });

        this.collection.set(document.uri, diagnostics);
    }

    dispose() {
        this.collection.dispose();
    }
}

module.exports = { DiagnosticProvider };