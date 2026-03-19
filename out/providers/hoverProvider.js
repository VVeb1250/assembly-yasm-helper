"use strict";
const vscode = require("vscode");
const { Utils } = require("../utils");

class TasmHoverProvider {
    constructor(registry) {
        this.registry = registry;
    }

    async provideHover(document, position, token) {
        let output = [];
        let line = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
        let quotes = line.match(/(\")/g) || line.match(/(\')/g);
        let comment = line.match(/^[^\;]*\;.*$/);

        if (!quotes && !comment) {
            let range = document.getWordRangeAtPosition(position);
            if (range) {
                let word = document.getText(range);
                let proc = this.registry.findProcedure(word);
                let variable = this.registry.findVariable(word);
                let keyword = this.registry.getKeyword(word);
                let macro = this.registry.findMacro(word);
                let label = this.registry.findLabel(word);

                if (Utils.isNumberStr(word)) {
                    output.push({ language: "assembly", value: Utils.getNumMsg(word) });
                } else if (variable) {
                    output.push({
                        language: "assembly",
                        value: `(Variable) ${variable.name}: ${variable.type}${variable.section ? "  [section " + variable.section + "]" : ""}`
                    });
                } else if (proc) {
                    output.push(
                        { language: "assembly", value: "(Procedure) " + proc.name },
                        { language: "plainText", value: proc.description.des },
                        { language: "assembly", value: proc.description.paramsString() },
                        { language: "assembly", value: proc.description.outputs() }
                    );
                } else if (macro) {
                    output.push({ language: "assembly", value: "(Macro) " + macro });
                } else if (keyword) {
                    output.push(
                        { language: "assembly", value: Utils.getType(keyword.type) + " " + keyword.name },
                        { language: "plainText", value: keyword.def },
                        { language: "assembly", value: "Syntax: " + keyword.data }
                    );
                } else if (label) {
                    output.push({ language: 'assembly', value: '(Label) ' + label.name + " => " + label.value });
                }
            }
        }
        return output.length > 0 ? new vscode.Hover(output) : null;
    }
}

module.exports = { TasmHoverProvider };