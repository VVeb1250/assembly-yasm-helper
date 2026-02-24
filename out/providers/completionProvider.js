"use strict";
const vscode = require("vscode");
const { Utils } = require("../utils");
const { KeywordType } = require("../data/enums");
const { KEYWORD_DICONTARY, REGISTERS } = require("../data/keywords");

class AsmCompletionProvider {
    constructor(registry, scanner) {
        this.registry = registry;
        this.scanner = scanner;
    }

    getItemKind(kind) {
        const kinds = {
            [KeywordType.instruction]: vscode.CompletionItemKind.Keyword,
            [KeywordType.memoryAllocation]: vscode.CompletionItemKind.Keyword,
            [KeywordType.precompiled]: vscode.CompletionItemKind.Interface,
            [KeywordType.register]: vscode.CompletionItemKind.Constant,
            [KeywordType.savedWord]: vscode.CompletionItemKind.Property,
            [KeywordType.size]: vscode.CompletionItemKind.Constructor,
            [KeywordType.variable]: vscode.CompletionItemKind.Variable,
            [KeywordType.method]: vscode.CompletionItemKind.Method,
            [KeywordType.structure]: vscode.CompletionItemKind.Struct,
            [KeywordType.label]: vscode.CompletionItemKind.Unit,
            [KeywordType.macro]: vscode.CompletionItemKind.Color,
            [KeywordType.file]: vscode.CompletionItemKind.File
        };
        return kinds[kind] || vscode.CompletionItemKind.Text;
    }

    createItem(name, type, detail = '', doc = "", insertText = null) {
        let item = new vscode.CompletionItem(name, this.getItemKind(type));
        item.detail = detail;
        item.documentation = doc;
        if (insertText) item.insertText = insertText;
        return item;
    }

    async provideCompletionItems(document, position, token, context) {
        let completions = new vscode.CompletionList();
        
        let docText = [];
        for (let i = 0; i < document.lineCount; i++) docText.push(document.lineAt(i).text);
        await this.scanner.scan(docText);

        let line = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
        if (line.match(/(\")/g) || line.match(/^[^\"]*#[^\{].*$/)) return completions; 

        let words = Utils.splitLine(line).map(w => w.toLowerCase());
        let isRootLevel = !line.match(/^\s/);

        if (words.length === 0 || words[0] === "section") {
            if (isRootLevel) {
                completions.items.push(this.createItem("section .data", KeywordType.savedWord, "(Section)", "Initialized data"));
                completions.items.push(this.createItem("section .text", KeywordType.savedWord, "(Section)", "Code section"));
                completions.items.push(this.createItem("section .bss", KeywordType.savedWord, "(Section)", "Uninitialized data"));
            } else if (words.length > 0 && line.includes(' ')) {
                ["data", "text", "bss"].forEach(sec => completions.items.push(this.createItem("." + sec, KeywordType.savedWord)));
            }
        } 
        else if (words.length > 0 && (words[0] === "global" || words[0] === "extern")) {
            completions.items.push(this.createItem("_start", KeywordType.label, "(Entry)", "Standard execution entry point"));
            this.registry.labels.forEach(l => completions.items.push(this.createItem(l, KeywordType.label, "(Label)")));
            this.registry.procs.forEach(p => completions.items.push(this.createItem(p.name, KeywordType.method, "(Procedure)")));
        } 
        else {
            let isInsideBracket = line.lastIndexOf('[') > line.lastIndexOf(']');
            if (isInsideBracket) {
                this.registry.vars.forEach(v => completions.items.push(this.createItem(v.name, KeywordType.variable, "(Variable)")));
            } else {
                REGISTERS.forEach(r => completions.items.push(this.createItem(r, KeywordType.register)));
                this.registry.vars.forEach(v => completions.items.push(this.createItem(v.name, KeywordType.variable, "(Variable)")));
                KEYWORD_DICONTARY.forEach(k => {
                    if ([KeywordType.instruction, KeywordType.memoryAllocation, KeywordType.size].includes(k.type)) {
                        completions.items.push(this.createItem(k.name, k.type, Utils.getType(k.type), k.def));
                    }
                });
            }
        }

        let uniqueItems = [];
        let labelsSeen = new Set();
        for (let item of completions.items) {
            if (!labelsSeen.has(item.label)) {
                labelsSeen.add(item.label);
                uniqueItems.push(item);
            }
        }
        completions.items = uniqueItems;

        return completions;
    }
}

module.exports = { AsmCompletionProvider };