"use strict";
const vscode = require("vscode");
const { KEYWORD_MAP } = require("../data/keywords");

class AsmSignatureHelpProvider {

    provideSignatureHelp(document, position, token, context) {
        if (!vscode.workspace.getConfiguration('assembly').get('enableSignatureHelp')) return null;

        const line = document.lineAt(position.line).text.slice(0, position.character);

        // skip if inside comment
        const commentIdx = line.indexOf(';');
        if (commentIdx !== -1 && commentIdx < position.character) return null;

        const trimmed = line.trimStart();
        const words = trimmed.split(/\s+/);
        if (words.length < 2) return null;

        const opcode = words[0].toLowerCase();
        const kw = KEYWORD_MAP.get(opcode);
        if (!kw || !kw.data) return null;

        const sig = new vscode.SignatureInformation(kw.data, kw.def || '');

        // parse parameters using index pairs so VS Code highlights the correct
        // parameter even when multiple params share the same name
        const paramStr = kw.data.slice(opcode.length).trim();
        if (paramStr) {
            let searchFrom = kw.data.length - paramStr.length;
            for (const p of paramStr.split(',')) {
                const label = p.trim();
                const start = kw.data.indexOf(label, searchFrom);
                const end   = start + label.length;
                sig.parameters.push(new vscode.ParameterInformation([start, end]));
                searchFrom = end + 1;
            }
        }

        // count commas after opcode to find active parameter
        const afterOpcode = line.slice(line.toLowerCase().indexOf(opcode) + opcode.length);
        const commaCount = (afterOpcode.match(/,/g) || []).length;

        const result = new vscode.SignatureHelp();
        result.signatures = [sig];
        result.activeSignature = 0;
        result.activeParameter = Math.min(commaCount, sig.parameters.length - 1);

        return result;
    }
}

module.exports = { AsmSignatureHelpProvider };
