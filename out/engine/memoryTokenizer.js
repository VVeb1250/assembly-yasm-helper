"use strict";

class MemoryTokenizer {

    static tokenize(expr) {
        const tokens = [];
        let current = "";
        for (let i = 0; i < expr.length; i++) {
            const c = expr[i];

            if ("+-*()".includes(c)) {

                if (current.trim() !== "") {
                    tokens.push(current.trim());
                }
                tokens.push(c);
                current = "";
                continue;
            }
            current += c;
        }
        if (current.trim() !== "") {
            tokens.push(current.trim());
        }
        return tokens;
    }
}
module.exports = { MemoryTokenizer };