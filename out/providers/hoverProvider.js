"use strict";
const vscode = require("vscode");
const path   = require("path");
const { getHoverContent } = require("../core/hoverEngine");

class TasmHoverProvider {
    constructor(registry, workspaceIndex = null) {
        this.registry       = registry;
        this.workspaceIndex = workspaceIndex;
    }

    async provideHover(document, position) {
        const line    = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
        const quotes  = line.match(/(\")/g) || line.match(/(\')/g);
        const comment = line.match(/^[^\;]*\;.*$/);
        if (quotes || comment) return null;

        const WORD_RE = /0x[0-9a-fA-F]+|[0-9][0-9a-fA-F]*[hH]|[01]+[bB]|[0-9]+[dD]?|[A-Za-z_.$?][\w.$?]*/;
        const range = document.getWordRangeAtPosition(position, WORD_RE);
        if (!range) return null;

        const word  = document.getText(range);

        // If symbol was declared extern → show cross-file definition info
        if (this.registry.externs?.has(word.toLowerCase())) {
            const defs = this.workspaceIndex ? this.workspaceIndex.findAllDefinitions(word) : [];
            if (defs.length === 1) {
                const d = defs[0];
                const content = [{ language: 'assembly', value: `(extern) ${word}  —  ${path.basename(d.filePath)} [line ${d.line + 1}]` }];
                if (d.doc) {
                    if (d.doc.des)           content.push({ language: 'plainText', value: d.doc.des });
                    if (d.doc.params.length) content.push({ language: 'assembly',  value: d.doc.params.map(p => `@arg: ${p}`).join('\n') });
                    if (d.doc.output.length) content.push({ language: 'assembly',  value: d.doc.output.map(o => `@out: ${o}`).join('\n') });
                }
                return new vscode.Hover(content);
            }
            if (defs.length > 1) {
                return new vscode.Hover(defs.map(d => ({
                    language: 'assembly',
                    value: `(extern) ${word}  —  ${path.basename(d.filePath)} [line ${d.line + 1}]`
                })));
            }
            // workspaceIndex not ready yet — show placeholder
            return new vscode.Hover({ language: 'assembly', value: `(extern) ${word}  —  Indexing workspace...` });
        }

        const output = getHoverContent(word, this.registry);
        return output ? new vscode.Hover(output) : null;
    }
}

module.exports = { TasmHoverProvider };