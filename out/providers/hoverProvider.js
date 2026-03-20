"use strict";
const vscode = require("vscode");
const { getHoverContent } = require("../core/hoverEngine");

class TasmHoverProvider {
    constructor(registry) {
        this.registry = registry;
    }

    async provideHover(document, position) {
        const line    = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
        const quotes  = line.match(/(\")/g) || line.match(/(\')/g);
        const comment = line.match(/^[^\;]*\;.*$/);
        if (quotes || comment) return null;

        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        const word   = document.getText(range);
        const output = getHoverContent(word, this.registry);
        return output ? new vscode.Hover(output) : null;
    }
}

module.exports = { TasmHoverProvider };