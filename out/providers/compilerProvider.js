"use strict";
const vscode = require("vscode");
const fs     = require("fs");
const { runCompiler, findCompiler } = require("../core/compilerEngine");

class CompilerProvider {
    constructor() {
        this.collection = vscode.languages.createDiagnosticCollection("assembly-compiler");
        this.statusBar  = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBar.show();
    }

    async analyze(document) {
        const config         = vscode.workspace.getConfiguration('assembly');
        const enabled        = config.get('enableCompilerCheck', false);
        const compilerType   = config.get('compilerType', 'yasm');
        const compilerFormat = config.get('compilerFormat', 'elf64');
        const debugInfo      = config.get('compilerDebugInfo', 'dwarf2');
        const outputExt      = config.get('outputExtension', 'o');

        if (!enabled) {
            this.collection.delete(document.uri);
            this.statusBar.text = '';
            return;
        }

        let compilerPath = config.get('compilerPath', '');
        if (!compilerPath) compilerPath = await findCompiler(compilerType);

        if (!compilerPath) {
            this.collection.delete(document.uri);
            this.statusBar.text    = `$(warning) ${compilerType.toUpperCase()}: compiler not found`;
            this.statusBar.tooltip = `Install ${compilerType} or set 'assembly.compilerPath' in settings`;
            return;
        }

        if (!fs.existsSync(compilerPath)) {
            this.statusBar.text    = `$(warning) ${compilerType.toUpperCase()}: not found at '${compilerPath}'`;
            this.statusBar.tooltip = `Check 'assembly.compilerPath' in settings`;
            return;
        }

        this.statusBar.text = `$(sync~spin) ${compilerType.toUpperCase()}: compiling...`;

        const plain = await runCompiler({
            compilerPath, compilerType, compilerFormat,
            debugInfo, outputExt, documentText: document.getText()
        });

        const diagnostics = plain.map(d => {
            const range = new vscode.Range(d.line, 0, d.line, Number.MAX_SAFE_INTEGER);
            const sev   = d.severity === 'warning'
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Error;
            const diag  = new vscode.Diagnostic(range, d.message, sev);
            diag.source = d.source;
            return diag;
        });

        this.collection.set(document.uri, diagnostics);

        if (diagnostics.length === 0) {
            this.statusBar.text = `$(check) ${compilerType.toUpperCase()}: ok`;
        } else {
            const errors   = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
            const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
            this.statusBar.text = `$(error) ${compilerType.toUpperCase()}: ${errors} error(s), ${warnings} warning(s)`;
        }
    }

    dispose() {
        this.collection.dispose();
        this.statusBar.dispose();
    }
}

module.exports = { CompilerProvider };