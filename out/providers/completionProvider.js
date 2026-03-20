"use strict";

const vscode = require("vscode");
const { KeywordType } = require("../data/enums");
const { getCompletionItems } = require("../core/completionEngine");

const KIND_MAP = {
    [KeywordType.instruction]:      vscode.CompletionItemKind.Keyword,
    [KeywordType.memoryAllocation]: vscode.CompletionItemKind.Keyword,
    [KeywordType.precompiled]:      vscode.CompletionItemKind.Interface,
    [KeywordType.register]:         vscode.CompletionItemKind.Constant,
    [KeywordType.savedWord]:        vscode.CompletionItemKind.Property,
    [KeywordType.size]:             vscode.CompletionItemKind.Constructor,
    [KeywordType.variable]:         vscode.CompletionItemKind.Variable,
    [KeywordType.method]:           vscode.CompletionItemKind.Method,
    [KeywordType.structure]:        vscode.CompletionItemKind.Struct,
    [KeywordType.label]:            vscode.CompletionItemKind.Unit,
    [KeywordType.macro]:            vscode.CompletionItemKind.Function,
    [KeywordType.file]:             vscode.CompletionItemKind.File,
    [KeywordType.constant]:         vscode.CompletionItemKind.Value,
    [KeywordType.operator]:         vscode.CompletionItemKind.Operator,
};

class AsmCompletionProvider {

    constructor(registry, scanner) {
        this.registry = registry;
        this.scanner  = scanner;
    }

    async provideCompletionItems(document, position, _token, context) {
        const completions = new vscode.CompletionList([], false);

        if (context.triggerCharacter === '\t') {
            const cfg = vscode.workspace.getConfiguration('assembly');
            if (!cfg.get('tabTriggerCompletions')) return completions;
        }

        if (context.triggerKind === vscode.CompletionTriggerKind.Invoke) {
            await this.scanner.scan(document.getText().split(/\r?\n/));
        }

        const line = document.lineAt(position.line).text.slice(0, position.character);

        // suppress space trigger when slot already has text
        if (context.triggerCharacter === ' ') {
            const noComment = line.split(';')[0];
            const words     = noComment.trimStart().split(/\s+/).map(w => w.toLowerCase());
            const commaIdx  = noComment.lastIndexOf(',');
            const slotText  = commaIdx !== -1
                ? noComment.slice(commaIdx + 1)
                : noComment.slice(noComment.search(/\S/) + (words[0] || '').length);
            if (slotText.trim().length > 0) return completions;
        }

        const lines = [];
        for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);

        const plain = getCompletionItems({ line, lineIdx: position.line, lines }, this.registry);
        completions.items = plain.map(p => {
            const item = new vscode.CompletionItem(p.label, KIND_MAP[p.kindType] ?? vscode.CompletionItemKind.Text);
            item.detail        = p.detail;
            item.documentation = p.doc;
            item.sortText      = p.sortText;
            if (p.insertText) item.insertText = p.insertText;
            return item;
        });

        return completions;
    }
}

module.exports = { AsmCompletionProvider };
