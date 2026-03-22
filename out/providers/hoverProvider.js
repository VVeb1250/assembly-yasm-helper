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

        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        const word  = document.getText(range);

        // If symbol was declared extern → show cross-file definition info
        const label = this.registry.findLabel(word);
        if (label?.line !== undefined && this.workspaceIndex) {
            const isExtern = document.lineAt(label.line).text.trimStart().toLowerCase().startsWith('extern');
            if (isExtern) {
                const defs = this.workspaceIndex.findAllDefinitions(word);
                if (defs.length > 0) {
                    const content = defs.map(d => ({
                        language: 'assembly',
                        value: `(extern) ${word}  —  ${path.basename(d.filePath)} [line ${d.line + 1}]`
                    }));
                    return new vscode.Hover(content);
                }
            }
        }

        const output = getHoverContent(word, this.registry);
        return output ? new vscode.Hover(output) : null;
    }
}

module.exports = { TasmHoverProvider };