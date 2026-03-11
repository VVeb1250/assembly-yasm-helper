"use strict";

class MemoryState {

    static resolve(tokens) {

        if (tokens.length === 0)
            return "BASE";
        
        const last = tokens[tokens.length - 1];

        switch (last) {
            case "+":
                return "PLUS";

            case "*":
                return "SCALE";

            case "(":
                return "PAREN_BASE";

            case ")":
                return "AFTER_PAREN";

            default:

                if (tokens.includes("*"))
                    return "SCALE_DONE";

                if (tokens.includes("+"))
                    return "AFTER_PLUS";

                return "BASE_DONE";
        }
    }
}

module.exports = { MemoryState };