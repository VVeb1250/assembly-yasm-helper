"use strict";
const vscode = require("vscode");
const { getFoldingRanges } = require("../core/foldingEngine");

class AsmFoldingProvider {
    provideFoldingRanges(document) {
        const lines = [];
        for (let i = 0; i < document.lineCount; i++) lines.push(document.lineAt(i).text);

        return getFoldingRanges(lines).map(r =>
            r.kind === 'region'
                ? new vscode.FoldingRange(r.start, r.end, vscode.FoldingRangeKind.Region)
                : new vscode.FoldingRange(r.start, r.end)
        );
    }
}

module.exports = { AsmFoldingProvider };
