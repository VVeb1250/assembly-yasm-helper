"use strict";

class MemoryAddressParser {

    static parse(expr) {
        expr = expr.trim();

        // ว่างเปล่า → แสดง base register / variable
        if (expr === "") {
            return "BASE";
        }

        // ยังไม่มี + → กำลังพิมพ์ base
        if (!expr.includes("+")) {
            // พิมพ์ base เสร็จแล้ว (มีตัวอักษร) → แนะนำ +
            if (expr.length > 0 && !expr.endsWith(" ")) {
                return "BASE_DONE";
            }
            return "BASE";
        }

        const parts = expr.split("+").map(p => p.trim());
        const last = parts[parts.length - 1];

        // จบด้วย + → กำลังรอ index register
        if (last === "") {
            return "INDEX";
        }

        // มี * หลัง +
        if (last.includes("*")) {
            const starParts = last.split("*");
            // พิมพ์ index แต่ยังไม่มีค่า scale → แนะนำ *
            if (starParts.length === 2 && starParts[1].trim() === "") {
                return "SCALE_INPUT";
            }
            // พิมพ์ scale เสร็จแล้ว → ไม่แนะนำอะไรเพิ่ม
            return "SCALE_DONE";
        }

        // มี index แล้วแต่ยังไม่มี * → แนะนำ *
        return "INDEX_DONE";
    }
}
module.exports = { MemoryAddressParser };