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

        // --- local lookups (current file + includes) ---
        const label = this.registry.findLabel(word);
        if (label && label.line !== undefined) {
            const isExternDecl = document.lineAt(label.line).text.trimStart().toLowerCase().startsWith('extern');
            if (!isExternDecl)
                return new vscode.Location(document.uri, new vscode.Position(label.line, 0));
            // extern declaration → fall through to workspace index
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
            if (defs.length > 0) {
                return defs.map(d => new vscode.Location(
                    vscode.Uri.file(d.filePath),
                    new vscode.Position(d.line, 0)
                ));
            }
        }

        return null;
    }
}

module.exports = { AsmDefinitionProvider };
