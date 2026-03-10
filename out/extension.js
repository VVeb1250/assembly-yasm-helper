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
    }

    activate() {
        this.context.subscriptions.push(
            vscode.languages.registerHoverProvider('assembly', new TasmHoverProvider(this.registry))
        );

        this.context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                'assembly',
                new AsmCompletionProvider(this.registry, this.scanner),
                ' ', '.', '[', ','
            )
        );

        this.context.subscriptions.push(this.diagnostics.collection);
        this.context.subscriptions.push(this.compiler.collection);

        // scan + analyze ทุกครั้งที่ไฟล์เปลี่ยน
        vscode.workspace.onDidChangeTextDocument(e => this.triggerScan(e.document));
        vscode.workspace.onDidOpenTextDocument(doc => this.triggerScan(doc));
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) this.triggerScan(editor.document);
        });

        // compiler รันเฉพาะตอน save
        vscode.workspace.onDidSaveTextDocument(doc => this.triggerScan(doc, true));
    }

    async triggerScan(document, runCompiler = false) {
        if (!document || document.languageId !== 'assembly') return;
        let docText = [];
        for (let i = 0; i < document.lineCount; i++) {
            docText.push(document.lineAt(i).text);
        }
        await this.scanner.scan(docText);
        this.diagnostics.analyze(document);

        if (runCompiler) {
            await this.compiler.analyze(document);
        }
    }
}

function activate(context) {
    const manager = new ExtensionManager(context);
    manager.activate();
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;