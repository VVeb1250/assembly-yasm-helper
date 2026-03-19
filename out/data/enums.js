"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowKinds = exports.KeywordType = void 0;
var KeywordType;
(function (KeywordType) {
    KeywordType[KeywordType["macroLabel"] = 0] = "macroLabel";
    KeywordType[KeywordType["file"] = 1] = "file";
    KeywordType[KeywordType["instruction"] = 2] = "instruction";
    KeywordType[KeywordType["register"] = 3] = "register";
    KeywordType[KeywordType["precompiled"] = 4] = "precompiled";
    KeywordType[KeywordType["memoryAllocation"] = 5] = "memoryAllocation";
    KeywordType[KeywordType["savedWord"] = 6] = "savedWord";
    KeywordType[KeywordType["size"] = 7] = "size";
    KeywordType[KeywordType["variable"] = 8] = "variable";
    KeywordType[KeywordType["method"] = 9] = "method";
    KeywordType[KeywordType["structure"] = 10] = "structure";
    KeywordType[KeywordType["macro"] = 11] = "macro";
    KeywordType[KeywordType["label"] = 12] = "label";
    KeywordType[KeywordType["constant"] = 13] = "constant";
    KeywordType[KeywordType["operator"] = 14] = "operator";
})(KeywordType = exports.KeywordType || (exports.KeywordType = {}));
var AllowKinds;
(function (AllowKinds) {
    AllowKinds[AllowKinds["memory"] = 0] = "memory";
    AllowKinds[AllowKinds["variables"] = 1] = "variables";
    AllowKinds[AllowKinds["constants"] = 2] = "constants";
    AllowKinds[AllowKinds["all"] = 3] = "all";
    AllowKinds[AllowKinds["size"] = 4] = "size";
    AllowKinds[AllowKinds["none"] = 5] = "none";
    AllowKinds[AllowKinds["inst"] = 6] = "inst";
    AllowKinds[AllowKinds["macro"] = 7] = "macro";
    AllowKinds[AllowKinds["label"] = 8] = "label";
    AllowKinds[AllowKinds["interrupt"] = 9] = "interrupt";
})(AllowKinds = exports.AllowKinds || (exports.AllowKinds = {}));
//# sourceMappingURL=enums.js.map