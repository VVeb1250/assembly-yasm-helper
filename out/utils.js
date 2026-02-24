"use strict";
const { KeywordType, AllowKinds } = require("./data/enums");

class Utils {
    static getType(type) {
        const types = {
            [KeywordType.instruction]: "(Command)",
            [KeywordType.memoryAllocation]: "(Memory)",
            [KeywordType.precompiled]: "(Instruction)",
            [KeywordType.register]: "(Register)",
            [KeywordType.savedWord]: "(Saved)",
            [KeywordType.size]: "(Size)",
            [KeywordType.label]: "(Label)",
            [KeywordType.macro]: "(Macro)",
            [KeywordType.method]: "(Procedure)",
            [KeywordType.structure]: "(Structure)",
            [KeywordType.variable]: "(Variable)"
        };
        return types[type] || "(Unknown)";
    }

    static clearSpace(str) {
        return str.replace(/[\n\t ]/g, "");
    }

    static splitLine(line) {
        const lineCutters = [' ', ',', '\t', '[', ']'];
        let array = [];
        let word = "";
        for (let i = 0; i < line.length; i++) {
            if (lineCutters.includes(line[i])) {
                word = Utils.clearSpace(word);
                if (word.length > 0) array.push(word);
                word = "";
                continue;
            }
            word += line[i];
        }
        word = Utils.clearSpace(word);
        if (word.length > 0) array.push(word);
        return array;
    }

    static isNumberStr(str) {
        if (!/^[0-9]/.test(str)) return false;
        let sub = (str.endsWith('h') || str.endsWith('b') || str.endsWith('d')) ? 1 : 0;
        const possibleNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
        for (let i = 1; i < str.length - sub; i++) {
            if (!possibleNumbers.includes(str[i].toLowerCase())) return false;
        }
        return true;
    }

    static getNumMsg(word) {
        let base = word.endsWith('h') ? 16 : word.endsWith('b') ? 2 : 10;
        let value = Number.parseInt(word, base);
        let s = `(${base === 16 ? "Hexadecimal" : base === 10 ? "Decimal" : "Binary"} Number) ${word}:\n`;
        if (base !== 10) s += `\tDecimal: ${value.toString(10)}\n`;
        if (base !== 16) s += `\tHexa: ${value.toString(16)}h\n`;
        if (base !== 2) s += `\tBinary: ${value.toString(2)}b\n`;
        return s;
    }
}

module.exports = { Utils };