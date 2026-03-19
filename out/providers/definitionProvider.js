"use strict";
const vscode = require("vscode");

class AsmDefinitionProvider {
    constructor(registry) {
        this.registry = registry;
    }

    provideDefinition(document, position, token) {
        if (!vscode.workspace.getConfiguration('assembly').get('enableGoToDefinition')) return null;

        const range = document.getWordRangeAtPosition(position);
        if (!range) return null;

        const word = document.getText(range);

        const label = this.registry.findLabel(word);
        if (label && label.line !== undefined) {
            return new vscode.Location(document.uri, new vscode.Position(label.line, 0));
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

        return null;
    }
}

module.exports = { AsmDefinitionProvider };
