"use strict";
const vscode  = require("vscode");
const { KEYWORD_MAP, REGISTERS, AVX_REGISTERS } = require("../data/keywords");

const IDENT_RE = /\b([A-Za-z_.$?][\w.$?]*)\b/g;

const REGISTER_SET = new Set([
    ...REGISTERS.map(r => r.toLowerCase()),
    ...AVX_REGISTERS.map(r => r.toLowerCase())
]);

class AsmRenameProvider {
    constructor(registry) {
        this.registry = registry;
    }

    prepareRename(document, position) {
        const range = document.getWordRangeAtPosition(position, IDENT_RE);
        if (!range) throw new Error('ไม่พบ identifier ตรงนี้');

        const word = document.getText(range);
        const key  = word.toLowerCase();

        if (KEYWORD_MAP.has(key) || REGISTER_SET.has(key))
            throw new Error(`"${word}" เป็น keyword/register ไม่สามารถ rename ได้`);

        const sym = this.registry.findLabel(key) ||
                    this.registry.findVariable(key) ||
                    this.registry.findProcedure(key) ||
                    this.registry.findMacro(key);

        if (!sym) throw new Error(`"${word}" ไม่ใช่ symbol ที่กำหนดไว้ในไฟล์นี้`);

        return range;
    }

    provideRenameEdits(document, position, newName) {
        const newKey = newName.toLowerCase();

        // guard: new name must not clash with a keyword or register
        if (KEYWORD_MAP.has(newKey) || REGISTER_SET.has(newKey))
            throw new Error(`"${newName}" เป็น keyword/register ไม่สามารถใช้เป็นชื่อได้`);

        const range = document.getWordRangeAtPosition(position, IDENT_RE);
        if (!range) return null;

        const word    = document.getText(range);
        const edit    = new vscode.WorkspaceEdit();
        const searchRe = new RegExp(`\\b${_escapeRegex(word)}\\b`, 'gi');

        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text.replace(/;.*$/, '');
            let m;
            searchRe.lastIndex = 0;
            while ((m = searchRe.exec(text)) !== null) {
                const start = new vscode.Position(i, m.index);
                const end   = new vscode.Position(i, m.index + m[0].length);
                edit.replace(document.uri, new vscode.Range(start, end), newName);
            }
        }

        return edit;
    }
}

function _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { AsmRenameProvider };
