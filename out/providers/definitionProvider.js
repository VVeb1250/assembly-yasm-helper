"use strict";
const vscode = require("vscode");

class AsmDefinitionProvider {
    constructor(registry, workspaceIndex = null) {
        this.registry       = registry;
        this.workspaceIndex = workspaceIndex;
    }

    provideDefinition(document, position, token) {
        if (!vscode.workspace.getConfiguration('assembly').get('enableGoToDefinition')) return null;

        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        const word = document.getText(range);

        // --- scoped local label (.done, .loop, etc.) ---
        if (word.startsWith('.') && this.registry.localLabelMap) {
            const parent = _findParentLabel(document, position.line);
            if (parent) {
                const scoped = this.registry.localLabelMap.get(parent.toLowerCase() + '/' + word.toLowerCase());
                if (scoped)
                    return new vscode.Location(document.uri, new vscode.Position(scoped.line, 0));
            }
        }

        // --- local lookups (current file + includes) ---
        const isExtern = this.registry.externs?.has(word.toLowerCase());
        if (!isExtern) {
            const label = this.registry.findLabel(word);
            if (label && label.line !== undefined)
                return new vscode.Location(document.uri, new vscode.Position(label.line, 0));
        } else {
            // extern: try cross-file first; fall back to local extern declaration line
            if (this.workspaceIndex) {
                const defs = this.workspaceIndex.findAllDefinitions(word);
                if (defs.length === 1)
                    return new vscode.Location(vscode.Uri.file(defs[0].filePath), new vscode.Position(defs[0].line, 0));
                if (defs.length > 1)
                    return defs.map(d => new vscode.Location(vscode.Uri.file(d.filePath), new vscode.Position(d.line, 0)));
            }
            // workspaceIndex not ready — jump to the extern declaration line in this file
            const label = this.registry.findLabel(word);
            if (label && label.line !== undefined)
                return new vscode.Location(document.uri, new vscode.Position(label.line, 0));
            return null;
        }

        const variable = this.registry.findVariable(word);
        if (variable && variable.line !== undefined) {
            return new vscode.Location(document.uri, new vscode.Position(variable.line, 0));
        }

        const proc = this.registry.findProcedure(word);
        if (proc && proc.line !== undefined) {
            return new vscode.Location(document.uri, new vscode.Position(proc.line, 0));
        }

        const macro = this.registry.findMacro(word);
        if (macro && macro.line !== undefined) {
            return new vscode.Location(document.uri, new vscode.Position(macro.line, 0));
        }

        // --- cross-file: workspace index ---
        if (this.workspaceIndex) {
            const defs = this.workspaceIndex.findAllDefinitions(word);
            if (defs.length === 1)
                return new vscode.Location(vscode.Uri.file(defs[0].filePath), new vscode.Position(defs[0].line, 0));
            if (defs.length > 1)
                return defs.map(d => new vscode.Location(vscode.Uri.file(d.filePath), new vscode.Position(d.line, 0)));
        }

        return null;
    }
}

/** Scan upward from lineIdx to find the nearest non-local label name */
function _findParentLabel(document, lineIdx) {
    const re = /^\s*([A-Za-z_.$?][\w.$?]*):/;
    for (let i = lineIdx; i >= 0; i--) {
        const m = document.lineAt(i).text.match(re);
        if (m && !m[1].startsWith('.')) return m[1];
    }
    return null;
}

module.exports = { AsmDefinitionProvider };
