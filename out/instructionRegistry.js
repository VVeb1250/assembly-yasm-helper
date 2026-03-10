"use strict";

const { INSTRUCTION_SET } = require("./data/instructions");

class InstructionRegistry {

    constructor() {

        this.map = new Map();

        for (const inst of INSTRUCTION_SET) {
            this.map.set(inst.name.toLowerCase(), inst);
        }

    }

    find(name) {
        return this.map.get(name.toLowerCase());
    }

    getAll() {
        return Array.from(this.map.values());
    }

}

module.exports = { InstructionRegistry };