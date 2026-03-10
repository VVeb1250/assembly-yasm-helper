"use strict";

const INSTRUCTION_SET = [

    {
        name: "mov",
        operands: "dest, src",
        description: "Move data from source to destination"
    },

    {
        name: "add",
        operands: "dest, src",
        description: "Add source to destination"
    },

    {
        name: "sub",
        operands: "dest, src",
        description: "Subtract source from destination"
    },

    {
        name: "mul",
        operands: "src",
        description: "Unsigned multiply"
    },

    {
        name: "div",
        operands: "src",
        description: "Unsigned divide"
    },

    {
        name: "jmp",
        operands: "label",
        description: "Jump to label"
    },

    {
        name: "call",
        operands: "label",
        description: "Call procedure"
    },

    {
        name: "ret",
        operands: "",
        description: "Return from procedure"
    },

    {
        name: "push",
        operands: "src",
        description: "Push value onto stack"
    },

    {
        name: "pop",
        operands: "dest",
        description: "Pop value from stack"
    }

];

module.exports = { INSTRUCTION_SET };