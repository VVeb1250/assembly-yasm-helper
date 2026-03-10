"use strict";

const { KeywordType } = require("./data/enums");

class Utils {

    static typeMap = {
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

    static getType(type) {
        return Utils.typeMap[type] || "(Unknown)";
    }

    static clearSpace(str) {
        return str.trim();
    }

    static splitLine(line) {

        return line
            .split(/[,\s\[\]\(\)]+/)
            .filter(Boolean);

    }

    static isNumberStr(str) {

        return (
            /^0x[0-9a-f]+$/i.test(str) ||
            /^[0-9]+$/i.test(str) ||
            /^[0-9a-f]+h$/i.test(str) ||
            /^[01]+b$/i.test(str) ||
            /^[0-9]+d$/i.test(str)
        );

    }

    static getNumMsg(word) {

        let base;
        let value;

        if (/^0x/i.test(word)) {

            base = 16;
            value = Number.parseInt(word, 16);

        } else if (word.endsWith("h")) {

            base = 16;
            value = Number.parseInt(word.slice(0, -1), 16);

        } else if (word.endsWith("b")) {

            base = 2;
            value = Number.parseInt(word.slice(0, -1), 2);

        } else {

            base = 10;
            value = Number.parseInt(word, 10);

        }

        if (Number.isNaN(value)) return null;

        let s = `(${base === 16 ? "Hexadecimal" : base === 2 ? "Binary" : "Decimal"} Number) ${word}:\n`;

        if (base !== 10) s += `\tDecimal: ${value.toString(10)}\n`;
        if (base !== 16) s += `\tHex: ${value.toString(16)}h / 0x${value.toString(16).toUpperCase()}\n`;
        if (base !== 2) s += `\tBinary: ${value.toString(2)}b\n`;

        return s;
    }

}

module.exports = { Utils };