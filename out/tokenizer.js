"use strict";

class AsmTokenizer {

    tokenize(line) {

        const tokens = [];
        let current = "";
        let inString = false;

        for (let i = 0; i < line.length; i++) {

            const ch = line[i];

            // comment
            if (!inString && ch === ';') {
                break;
            }

            // string start/end
            if (ch === '"' || ch === "'") {

                current += ch;

                if (inString) {
                    tokens.push(current);
                    current = "";
                    inString = false;
                } else {
                    inString = true;
                }

                continue;
            }

            if (inString) {
                current += ch;
                continue;
            }

            // separators
            if (/\s|,|\[|\]|\(|\)/.test(ch)) {

                if (current.length) {
                    tokens.push(current);
                    current = "";
                }

                if (!/\s/.test(ch)) {
                    tokens.push(ch);
                }

                continue;
            }

            current += ch;
        }

        if (current.length) {
            tokens.push(current);
        }

        return tokens;
    }
}

module.exports = { AsmTokenizer };