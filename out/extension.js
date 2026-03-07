"use strict";
const vscode = require("vscode");
const { SymbolRegistry } = require("./registry");
const { DocumentScanner } = require("./scanner");
const { TasmHoverProvider } = require("./providers/hoverProvider");
const { AsmCompletionProvider } = require("./providers/completionProvider");

class ExtensionManager {
    constructor(context) {
        this.context = context;
        this.registry = new SymbolRegistry();
        this.scanner = new DocumentScanner(this.registry);
    }

    activate() {
        // Register various features with the assembly language
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

        // Catch event when a file is opened, saved, or edited
        vscode.workspace.onDidChangeTextDocument(e => this.triggerScan(e.document));
        vscode.workspace.onDidOpenTextDocument(doc => this.triggerScan(doc));
        vscode.workspace.onDidSaveTextDocument(doc => this.triggerScan(doc));
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) this.triggerScan(editor.document);
        });
    }

    async triggerScan(document) {
        if (!document) return;
        let docText = [];
        for (let i = 0; i < document.lineCount; i++) {
            docText.push(document.lineAt(i).text);
        }
        await this.scanner.scan(docText);
    }
}

function activate(context) {
    const manager = new ExtensionManager(context);
    manager.activate();
}
exports.activate = activate;

function deactivate() {
    // Code for cleanup when closing the Extension (if any)
}
exports.deactivate = deactivate;