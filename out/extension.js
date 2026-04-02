"use strict";
const vscode = require("vscode");
const { SymbolRegistry } = require("./registry");
const { DocumentScanner } = require("./scanner");
const { TasmHoverProvider } = require("./providers/hoverProvider");
const { AsmCompletionProvider } = require("./providers/completionProvider");
const { DiagnosticProvider } = require("./providers/diagnosticProvider");
const { CompilerProvider } = require("./providers/compilerProvider");
const { AsmDefinitionProvider } = require("./providers/definitionProvider");
const { AsmDocumentSymbolProvider } = require("./providers/symbolProvider");
const { AsmSignatureHelpProvider } = require("./providers/signatureHelpProvider");
const { AsmSemanticTokensProvider, SEMANTIC_TOKENS_LEGEND } = require("./providers/semanticTokensProvider");
const { AsmFoldingProvider }    = require("./providers/foldingProvider");
const { AsmReferencesProvider } = require("./providers/referencesProvider");
const { AsmRenameProvider }     = require("./providers/renameProvider");
const { RunProvider }           = require("./providers/runProvider");
const { WorkspaceIndex }        = require("./vsc/workspaceIndex");

class ExtensionManager {
    constructor(context) {
        this.context = context;
        this.registry = new SymbolRegistry();
        this.scanner = new DocumentScanner(this.registry);
        this.diagnostics = new DiagnosticProvider(this.registry);
        this.compiler        = new CompilerProvider();
        this.runner          = new RunProvider();
        this.workspaceIndex  = new WorkspaceIndex();
        this.semanticTokens = new AsmSemanticTokensProvider(this.registry);
        this._debounceTimer = null;
    }

    async activate() {
        this.context.subscriptions.push(
            vscode.languages.registerHoverProvider('assembly', new TasmHoverProvider(this.registry, this.workspaceIndex))
        );

        this.context.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                'assembly',
                new AsmCompletionProvider(this.registry, this.scanner, this.workspaceIndex),
                ' ', '.', '[', ',', '\t', '+', '*', '('
            )
        );

        this.context.subscriptions.push(
            vscode.languages.registerDefinitionProvider('assembly', new AsmDefinitionProvider(this.registry, this.workspaceIndex))
        );

        this.context.subscriptions.push(
            vscode.languages.registerDocumentSymbolProvider('assembly', new AsmDocumentSymbolProvider(this.registry))
        );

        this.context.subscriptions.push(
            vscode.languages.registerSignatureHelpProvider(
                'assembly',
                new AsmSignatureHelpProvider(this.registry),
                ' ', ','
            )
        );

        this.context.subscriptions.push(
            vscode.languages.registerDocumentSemanticTokensProvider(
                'assembly',
                this.semanticTokens,
                SEMANTIC_TOKENS_LEGEND
            )
        );

        this.context.subscriptions.push(
            vscode.languages.registerFoldingRangeProvider('assembly', new AsmFoldingProvider())
        );

        this.context.subscriptions.push(
            vscode.languages.registerReferenceProvider('assembly', new AsmReferencesProvider(this.registry))
        );

        this.context.subscriptions.push(
            vscode.languages.registerRenameProvider('assembly', new AsmRenameProvider(this.registry))
        );

        this.context.subscriptions.push(this.diagnostics.collection);
        this.context.subscriptions.push(this.compiler.collection);

        this.context.subscriptions.push(
            vscode.commands.registerCommand('assembly.buildAndRun', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.document.languageId !== 'assembly') {
                    vscode.window.showWarningMessage('Open an assembly file first.');
                    return;
                }
                await this.runner.buildAndRun(editor.document, this.workspaceIndex);
            })
        );
        this.context.subscriptions.push(
            vscode.commands.registerCommand('assembly.debug', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.document.languageId !== 'assembly') {
                    vscode.window.showWarningMessage('Open an assembly file first.');
                    return;
                }
                await this.runner.debugWithDDD(editor.document, this.workspaceIndex);
            })
        );
        this.context.subscriptions.push(
            vscode.commands.registerCommand('assembly.createConfig', async () => {
                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.document.languageId !== 'assembly') {
                    vscode.window.showWarningMessage('Open an assembly file first.');
                    return;
                }
                await this.runner.createConfig(editor.document, this.workspaceIndex);
            })
        );
        this.context.subscriptions.push(this.runner);

        // scan + analyze ทุกครั้งที่ไฟล์เปลี่ยน
        // use subscriptions for fix Memory Leak
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(e => this.scheduleScan(e.document))
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

        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('assembly.tabSize')) this._applyTabSize();
            })
        );

        await this.workspaceIndex.activate(this.context);
        this._applyTabSize();

        if (vscode.window.activeTextEditor) {
            await this.triggerScan(vscode.window.activeTextEditor.document);
        }
    }

    _applyTabSize() {
        const size = vscode.workspace.getConfiguration('assembly').get('tabSize', 8);
        vscode.workspace.getConfiguration('editor', { languageId: 'assembly' })
            .update('tabSize', size, vscode.ConfigurationTarget.Global, true);
    }

    scheduleScan(document) {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this._debounceTimer = null;
            this.triggerScan(document);
        }, 300);
    }

    async triggerScan(document, runCompiler = false) {
        if (!document || document.languageId !== 'assembly' || document.uri.scheme !== 'file') return;
        const docText = document.getText().split(/\r?\n/);
        this.scanner.currentFilePath = document.uri.fsPath;
        await this.scanner.scan(docText);
        this.workspaceIndex._indexFile(document.uri.fsPath);
        this.diagnostics.analyze(document);
        this.semanticTokens.fire();

        if (runCompiler) {
            await this.compiler.analyze(document);
        }
    }
}

function activate(context) {
    console.log("MY VERSION LOADED ✅");
    const manager = new ExtensionManager(context);
    return manager.activate();
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;