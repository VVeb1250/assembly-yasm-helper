"use strict";
const vscode = require("vscode");
const { SymbolRegistry } = require("./registry");
const { DocumentScanner } = require("./scanner");
const { TasmHoverProvider } = require("./providers/hoverProvider");
const { AsmCompletionProvider } = require("./providers/completionProvider");
const { DiagnosticProvider } = require("./providers/diagnosticProvider");
const { CompilerProvider } = require("./providers/compilerProvider");

class ExtensionManager {
    constructor(context) {
        this.context = context;
        this.registry = new SymbolRegistry();
        this.scanner = new DocumentScanner(this.registry);
        this.diagnostics = new DiagnosticProvider(this.registry);
        this.compiler = new CompilerProvider();
        this.isScanning = false;
    }

    activate() {
        this.context.subscriptions.push(
            vscode.languages.registerHoverProvider('assembly', new TasmHoverProvider(this.registry))
        );

        this.context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                'assembly',
                new AsmCompletionProvider(this.registry, this.scanner),
                ' ', '.', '[', ',', '\t', '+', '*', '('
            )
        );

        this.context.subscriptions.push(this.diagnostics.collection);
        this.context.subscriptions.push(this.compiler.collection);

        // scan + analyze ทุกครั้งที่ไฟล์เปลี่ยน
        // use subscriptions for fix Memory Leak
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(e => this.triggerScan(e.document))
        );
        this.context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(doc => this.triggerScan(doc))
        );
        this.context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) this.triggerScan(editor.document);
            })
        );
        this.context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(doc => this.triggerScan(doc, true))
        );

        if (vscode.window.activeTextEditor) {
            this.triggerScan(vscode.window.activeTextEditor.document);
        }
    }

    async triggerScan(document, runCompiler = false) {
        // if (this.isScanning) return;
        this.isScanning = true;

        try {
            if (!document || document.languageId !== 'assembly' || document.uri.scheme !== 'file') return;
            const docText = document.getText().split(/\r?\n/);
            await this.scanner.scan(docText);
            this.diagnostics.analyze(document);
    
            if (runCompiler) {
                await this.compiler.analyze(document);
            }
        } finally {
            this.isScanning = false;
        }
    }
}

function activate(context) {
    console.log("MY VERSION LOADED ✅");
    const manager = new ExtensionManager(context);
    manager.activate();
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;