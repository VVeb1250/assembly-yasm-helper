"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileData = void 0;
class FileData {
    constructor() {
        this.labels = [];
        this.procs = [];
        this.macros = [];
    }
    pushLabel(label) {
        this.labels.push(label);
    }
    pushMacro(macro) {
        this.macros.push(macro);
    }
    pushProc(proc) {
        this.procs.push(proc);
    }
}
exports.FileData = FileData;
//# sourceMappingURL=fileData.js.map