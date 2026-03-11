"use strict";

class MemoryAddressParser {

    static parse(expr) {
        expr = expr.trim();

        if (expr === "") {
            return "BASE";
        }
        if (!expr.includes("+")) {
            return "BASE";
        }
        const parts = expr.split("+").map(p => p.trim());
        const last = parts[parts.length - 1];
        
        if (last.includes("*")) {
            const starParts = last.split("*");

            if (starParts.length === 1) {
                return "STAR";
            }
            return "SCALE";
        }
        if (parts.length === 1) {
            return "PLUS";
        }
        return "INDEX";
    }
}
module.exports = { MemoryAddressParser };