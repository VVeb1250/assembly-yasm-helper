"use strict";
const vscode = require("vscode");
const { KEYWORD_MAP } = require("../data/keywords");
const { INSTRUCTION_SIGNATURES } = require("../data/instructionSignatures");

// Convert an OperandType bitfield to a readable string
const _ts = b => ((b&3)===3)?'r/m':(b&1)?'reg':(b&2)?'mem':(b&4)?'imm':(b&8)?'label':'?';

class AsmSignatureHelpProvider {

    provideSignatureHelp(document, position, token, context) {
        if (!vscode.workspace.getConfiguration('assembly').get('enableSignatureHelp')) return null;

        const line = document.lineAt(position.line).text.slice(0, position.character);

        const commentIdx = line.indexOf(';');
        if (commentIdx !== -1 && commentIdx < position.character) return null;

        const trimmed = line.trimStart();
        const words = trimmed.split(/\s+/);
        if (words.length < 2) return null;

        const opcode = words[0].toLowerCase();
        const kw = KEYWORD_MAP.get(opcode);
        const sigs = INSTRUCTION_SIGNATURES[opcode];

        // count commas after opcode to determine active parameter index
        const afterOpcode = line.slice(line.toLowerCase().indexOf(opcode) + opcode.length);
        const commaCount = (afterOpcode.match(/,/g) || []).length;

        const result = new vscode.SignatureHelp();

        if (sigs?.length) {
            result.signatures = sigs.map(form => {
                const label = form.length
                    ? `${opcode} ${form.map(_ts).join(', ')}`
                    : opcode;
                const sig = new vscode.SignatureInformation(label, kw?.def || '');
                let searchFrom = opcode.length + (form.length ? 1 : 0);
                for (const bits of form) {
                    const name = _ts(bits);
                    const start = label.indexOf(name, searchFrom);
                    const end   = start + name.length;
                    sig.parameters.push(new vscode.ParameterInformation([start, end]));
                    searchFrom = end + 1;
                }
                return sig;
            });

            // pick the best matching signature based on already-typed operands
            const typedParts = afterOpcode.split(',');
            let activeIdx = 0;
            if (commaCount > 0) {
                const completedOps = typedParts.slice(0, commaCount).map(o => o.trim());
                for (let i = 0; i < sigs.length; i++) {
                    if (sigs[i].length < typedParts.length) continue;
                    if (completedOps.every((op, j) => !op || (this._classify(op) & sigs[i][j]))) {
                        activeIdx = i;
                        break;
                    }
                }
            }

            result.activeSignature = activeIdx;
            result.activeParameter = Math.min(commaCount, sigs[activeIdx].length - 1);

        } else if (kw?.data) {
            // fallback: single signature from keyword data
            const sig = new vscode.SignatureInformation(kw.data, kw.def || '');
            const paramStr = kw.data.slice(opcode.length).trim();
            if (paramStr) {
                let searchFrom = kw.data.length - paramStr.length;
                for (const p of paramStr.split(',')) {
                    const name = p.trim();
                    const start = kw.data.indexOf(name, searchFrom);
                    const end   = start + name.length;
                    sig.parameters.push(new vscode.ParameterInformation([start, end]));
                    searchFrom = end + 1;
                }
            }
            result.signatures      = [sig];
            result.activeSignature = 0;
            result.activeParameter = Math.min(commaCount, sig.parameters.length - 1);

        } else {
            return null;
        }

        return result;
    }

    // Lightweight operand classifier for signature matching
    _classify(op) {
        if (op.includes('[')) return 2; // MEM
        const tokens = op.split(/\s+/).filter(t => t.length > 0);
        if (tokens.some(t => this._isReg(t))) return 1; // REG
        if (tokens.length === 1 && /^(0x[0-9a-f]+|[0-9][0-9a-f]*[hbd]?)$/i.test(tokens[0])) return 4; // IMM
        return 8 | 4; // LABEL | IMM
    }

    _isReg(w) {
        return /^(r(ax|bx|cx|dx|si|di|bp|sp)|e(ax|bx|cx|dx|si|di|bp|sp)|[abcd][xhl]|[sd]il|[bs]pl|r\d{1,2}[bdw]?|[xyz]mm\d+|k[0-7]|[cdefgs]s|[re]ip|rflags|eflags)$/i.test(w);
    }
}

module.exports = { AsmSignatureHelpProvider };
