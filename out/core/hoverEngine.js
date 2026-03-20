"use strict";

const { Utils } = require("../utils");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");

/**
 * Get hover content for a word.
 * @param {string} word
 * @param {object} registry
 * @returns {{ language: string, value: string }[] | null}
 */
function getHoverContent(word, registry) {
    const output = [];
    const proc     = registry.findProcedure(word);
    const variable = registry.findVariable(word);
    const keyword  = registry.getKeyword(word);
    const macro    = registry.findMacro(word);
    const label    = registry.findLabel(word);

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
        const argStr  = macro.argCount !== undefined ? `  — ${macro.argCount} arg${macro.argCount !== 1 ? 's' : ''}` : '';
        const lineStr = macro.line !== undefined ? `  [line ${macro.line + 1}]` : '';
        output.push({ language: "assembly", value: "(Macro) " + macro.name + argStr + lineStr });
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

    return output.length > 0 ? output : null;
}

module.exports = { getHoverContent };
