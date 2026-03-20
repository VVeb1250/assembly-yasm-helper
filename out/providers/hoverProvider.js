"use strict";
const vscode = require("vscode");
const { Utils } = require("../utils");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");

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
                    const macroLine = macro.line !== undefined ? `  [line ${macro.line + 1}]` : '';
                    output.push({ language: "assembly", value: "(Macro) " + macro.name + macroLine });
                } else if (keyword) {
                    output.push(
                        { language: "assembly", value: Utils.getType(keyword.type) + " " + keyword.name },
                        { language: "plainText", value: keyword.def },
                        { language: "assembly", value: "Syntax: " + keyword.data }
                    );
                    const sigs = INSTRUCTION_SIGNATURES[word.toLowerCase()];
                    if (sigs?.length) {
                        const ts = b => ((b&3)===3)?'r/m':(b&1)?'reg':(b&2)?'mem':(b&4)?'imm':(b&8)?'label':'?';
                        const forms = sigs.map(f =>
                            f.length ? `${word.toLowerCase()} ${f.map(ts).join(', ')}` : word.toLowerCase()
                        ).join('\n');
                        output.push({ language: 'assembly', value: forms });
                    }
                } else if (label) {
                    const lineInfo = label.line !== undefined
                        ? `  [line ${label.line + 1}]`
                        : (label.value ? ` => ${label.value}` : '');
                    output.push({ language: 'assembly', value: '(Label) ' + label.name + lineInfo });
                }
            }
        }
        return output.length > 0 ? new vscode.Hover(output) : null;
    }
}

module.exports = { TasmHoverProvider };