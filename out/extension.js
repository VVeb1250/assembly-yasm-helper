"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fstream = require("fs");
const enums_1 = require("./data/enums");
const structs_1 = require("./data/structs");
const keywords_1 = require("./data/keywords");
function getType(type) {
    switch (type) {
        case enums_1.KeywordType.instruction:
            return "(Command)";
        case enums_1.KeywordType.memoryAllocation:
            return "(Memory)";
        case enums_1.KeywordType.precompiled:
            return "(Instruction)";
        case enums_1.KeywordType.register:
            return "(Register)";
        case enums_1.KeywordType.savedWord:
            return "(Saved)";
        case enums_1.KeywordType.size:
            return "(Size)";
        case enums_1.KeywordType.label:
            return "(Label)";
        case enums_1.KeywordType.macro:
            return "(Macro)";
        case enums_1.KeywordType.method:
            return "(Procedure)";
        case enums_1.KeywordType.structure:
            return "(Structure)";
        case enums_1.KeywordType.variable:
            return "(Variable)";
    }
    return "(Unknown)";
}
const labels = [], vars = [];
var ComplitionType;
(function (ComplitionType) {
    ComplitionType[ComplitionType["lower"] = 0] = "lower";
    ComplitionType[ComplitionType["camel"] = 1] = "camel";
    ComplitionType[ComplitionType["upper"] = 2] = "upper";
    ComplitionType[ComplitionType["undected"] = 3] = "undected";
})(ComplitionType || (ComplitionType = {}));
function getComplitionType(word) {
    let isupper = (w) => 'A' <= w && w <= 'Z';
    let firstIsupper = isupper(word[0]);
    let uppercount = firstIsupper ? 1 : 0;
    for (let i = 1; i < word.length; i++) {
        if (isupper(word[i])) {
            uppercount++;
        }
    }
    if (uppercount === word.length) {
        return ComplitionType.upper;
    }
    else if (uppercount === 1 && firstIsupper) {
        return ComplitionType.camel;
    }
    else if (uppercount === 0) {
        return ComplitionType.lower;
    }
    else {
        return ComplitionType.undected;
    }
}
function complete(word, ct) {
    switch (ct) {
        case ComplitionType.lower: return word.toLowerCase();
        case ComplitionType.upper: return word.toUpperCase();
        case ComplitionType.camel: return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }
    return word;
}
function getKeyword(word) {
    for (let i = 0; i < keywords_1.KEYWORD_DICONTARY.length; i++) {
        const keyword = keywords_1.KEYWORD_DICONTARY[i];
        if (keyword.name === word) {
            return keyword;
        }
    }
    return;
}
const possibleNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
function isNumberStr(str) {
    if (!str.startsWith('0') && !str.startsWith('1') && !str.startsWith('2') && !str.startsWith('3')
        && !str.startsWith('4') && !str.startsWith('5') && !str.startsWith('6') && !str.startsWith('7')
        && !str.startsWith('8') && !str.startsWith('9')) {
        return false;
    }
    let sub = (str.endsWith('h') || str.endsWith('b') || str.endsWith('d')) ? 1 : 0;
    for (let i = 1; i < str.length - sub; i++) {
        const char = str[i];
        if (possibleNumbers.indexOf(char, 0) <= -1) {
            return false;
        }
    }
    return true;
}
function getNumMsg(word) {
    let base = word.endsWith('h') ? 16 : word.endsWith('b') ? 2 : 10;
    var value = Number.parseInt(word, base);
    var s = "(" + (base === 16 ? "Hexadecimal" : base === 10 ? "Decimal" : "Binary") + " Number) " + word + ":\n";
    if (base !== 10) {
        s += "\tDecimal: " + value.toString(10) + "\n";
    }
    if (base !== 16) {
        s += "\tHexa: " + value.toString(16) + "h\n";
    }
    if (base !== 2) {
        s += "\tBinary: " + value.toString(2) + "b\n";
    }
    return s;
}
function findProc(name) {
    for (const proc of procs) {
        if (proc.name === name) {
            return proc;
        }
    }
    return;
}
function createInformation(text) {
    let out = new structs_1.Info("", "");
    for (let i = 0; i < text.length; i++) {
        const line = text[i];
        if (line.startsWith("@out: ")) {
            out.output.push(line.substring(line.indexOf(' ', line.indexOf('@out: '))));
        }
        else if (line.startsWith("@arg: ")) {
            out.params.push(clearSpace(line.substring(line.indexOf(' ', line.indexOf('@arg: ')))));
        }
        else {
            out.des += line;
        }
    }
    return out;
}
function findMacro(name) {
    for (const mac of macros) {
        if (mac.name === name) {
            return mac;
        }
    }
    return;
}
function findLabel(name) {
    for (const label of labelsEE) {
        if (label.name === name) {
            return label;
        }
    }
    return;
}
//Hover provider
class TasmHoverProvider {
    provideHover(document, position, token) {
        return __awaiter(this, void 0, void 0, function* () {
            let output = [];
            let line = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
            let quotes = null;
            let comment = null;
            if (line) {
                quotes = line.match(/(\")/g) || line.match(/(\')/g);
                comment = line.match(/^[^\;]*#.*$/);
            }
            if (quotes === null && comment === null) {
                let range = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character));
                if (range) {
                    let word = document.getText(range);
                    let proc = findProc(word), keyword = getKeyword(word), macro = findMacro(word), label = findLabel(word);
                    if (isNumberStr(word)) {
                        output.push({
                            language: "assembly",
                            value: getNumMsg(word)
                        });
                    }
                    else if (proc !== undefined) {
                        output.push({
                            language: "assembly",
                            value: "(Procedure) " + proc.name
                        }, {
                            language: "plainText",
                            value: proc.description.des
                        }, {
                            language: "assembly",
                            value: proc.description.paramsString()
                        }, {
                            language: "assembly",
                            value: proc.description.outputs()
                        });
                    }
                    else if (macro !== undefined) {
                        if (macro.short) {
                            output.push({
                                language: "assembly",
                                value: "(Macro) " + macro.name + " => " + macro.des.des
                            });
                        }
                        else {
                            output.push({
                                language: "assembly",
                                value: "(Macro) " + macro.name
                            }, {
                                language: "plainText",
                                value: macro.des.des
                            }, {
                                language: "assembly",
                                value: macro.des.paramsStringMac()
                            }, {
                                language: "assembly",
                                value: macro.des.outputs()
                            });
                        }
                    }
                    else if (keyword !== undefined) {
                        output.push({
                            language: "assembly",
                            value: getType(keyword.type) + " " + keyword.name
                        }, {
                            language: "plainText",
                            value: keyword.def
                        }, {
                            language: "assembly",
                            value: "Syntax: " + keyword.data
                        });
                    }
                    else if (label !== undefined) {
                        output.push({
                            language: 'assembly',
                            value: '(Label) ' + label.name + " => " + label.value
                        });
                    }
                }
            }
            return new vscode.Hover(output);
        });
    }
}
const lineCutters = [' ', ',', '\t', '[', ']'];;
const spaceVar = ['\n', ' ', '\t'];
function isAllSpace(a) {
    for (let i = 0; i < a.length; i++) {
        if (spaceVar.indexOf(a[i]) <= -1) {
            return false;
        }
    }
    return true;
}
function clearSpace(str) {
    var f = "";
    for (let i = 0; i < str.length; i++) {
        if (spaceVar.indexOf(str[i]) > -1) {
            continue;
        }
        f += str[i];
    }
    return f;
}
function findVar(varName) {
    for (let i = 0; i < vars.length; i++) {
        const variable = vars[i];
        if (variable.name === varName) {
            return variable;
        }
    }
    return;
}
const labelsEE = [];
const procs = [];
const structs = [];
const macros = [];
const findSpaceIndex = (text, start = 0) => {
    let index = -1;
    for (let i = 0; i < spaceVar.length; i++) {
        const char = spaceVar[i];
        let vIndex = text.indexOf(char, start);
        if ((vIndex < index && vIndex >= 0) || index < 0) {
            index = vIndex;
        }
    }
    return index;
};
function defStruc(line) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < structs.length; i++) {
            const struct = structs[i];
            if (yield line.includes(struct)) {
                return true;
            }
        }
        return false;
    });
}
function readStruc(start, end, document, kind) {
    let out = [];
    for (let i = start; i <= end; i++) {
        const line = document[i];
        const cleanLine = clearSpace(line);
        var first = cleanLine.charAt(0);
        var fistInd = line.indexOf(first);
        out.push(clearSpace(line.substring(fistInd, findSpaceIndex(line, fistInd))));
    }
    return out;
}
function filter(list) {
    let items = new vscode.CompletionList();
    // Removes duplicates
    for (let i = 0; i < list.items.length; i++) {
        const item = list.items[i];
        let append = true;
        for (let j = 0; j < list.items.length; j++) {
            if (j === i) {
                continue;
            }
            const item2 = list.items[j];
            if (item2.label === item.label) {
                append = false;
                break;
            }
        }
        if (append) {
            items.items.push(item);
        }
    }
    return items;
}
let structureInfo = [];
let logInfo = [];
const includedFiles = [];
function sacnDoc(document, alsoVars = true) {
    return __awaiter(this, void 0, void 0, function* () {
        //Clean all data lists
        logInfo = [];
        if (alsoVars) {
            labels.splice(0, labels.length);
            labelsEE.splice(0, labelsEE.length);
            vars.splice(0, vars.length);
            macros.splice(0, macros.length);
            structs.splice(0, structs.length);
            procs.splice(0, procs.length);
            structureInfo.splice(0, structureInfo.length);
            includedFiles.splice(0, includedFiles.length);
            if (vscode.window.activeTextEditor !== undefined) {
                includedFiles.push(vscode.window.activeTextEditor.document.uri.path);
            }
        }
        //Scan document
        for (let x = 0; x < document.length; x++) {
            const line = document[x];
            //is the name a varibles
            //console.log(line + " <= " + defStruc(line));
            let isVar = line.includes(" db") || line.includes(" dw") || line.includes(" dd") || line.includes(" dq") || line.includes(" dt") || (yield defStruc(line));
            //Is a label
            if (line.endsWith(':')) { //is the line a label
                labels.push(clearSpace(line.substring(0, line.length - 1)));
            }
            let cleanLine = clearSpace(line);
            //Is a variable
            if (isVar && alsoVars) {
                var first = cleanLine.charAt(0);
                var fistInd = line.indexOf(first);
                let space1 = findSpaceIndex(line, fistInd);
                let space2 = findSpaceIndex(line, space1 + 1);
                vars.push({
                    name: clearSpace(line.substring(fistInd, space1)),
                    type: clearSpace(line.substring(space1, space2))
                });
            }
            var firstSpace, spaceOne, length = 0;
            //Is a procedure
            if (cleanLine.startsWith("proc")) {
                let des = new structs_1.Info("", "");
                let text = [];
                let ptr = x;
                while (ptr - 1 >= 0) {
                    ptr--;
                    if (clearSpace(document[ptr]).startsWith(';')) {
                        text.push(document[ptr].substring(document[ptr].indexOf(';') + 1));
                    }
                    else {
                        break;
                    }
                }
                des = createInformation(text);
                firstSpace = line.indexOf(' ', line.indexOf('c'));
                spaceOne = line.indexOf(' ', firstSpace + 1);
                length = spaceOne - firstSpace;
                let name = spaceOne > -1 ? cleanLine.substr(cleanLine.indexOf('c') + 1, length - 1) : cleanLine.substring(cleanLine.indexOf('c') + 1);
                des.name = name;
                if (findProc(name) === undefined) {
                    procs.push(new structs_1.Procedure(name, des));
                }
            }
            if (cleanLine.startsWith('label')) {
                let name = "";
                firstSpace = line.indexOf(' ', line.indexOf('l'));
                spaceOne = line.indexOf(' ', firstSpace + 1);
                length = spaceOne - firstSpace;
                name = cleanLine.substr(firstSpace, length - 1);
                labelsEE.push(new structs_1.Label(name, line.substring(line.indexOf(' ', line.indexOf(name)))));
            }
            //Structures
            if (cleanLine.startsWith("struc")) {
                let startRead = x;
                while (!document[x + 1].includes("ends")) {
                    x++;
                }
                let sname = line.indexOf(' ');
                let ename = line.indexOf(' ', sname + 1);
                if (ename === -1) {
                    ename = line.length;
                }
                let name = line.substring(sname + 1, ename);
                structureInfo.push({
                    name: name,
                    values: readStruc(startRead + 1, x, document, name)
                });
                structs.push(name);
                x++;
            }
            if (cleanLine.startsWith("macro")) {
                let des = new structs_1.Info("", "");
                let text = [];
                let ptr = x;
                while (ptr - 1 >= 0) {
                    ptr--;
                    if (clearSpace(document[ptr]).startsWith(';')) {
                        text.push(document[ptr].substring(document[ptr].indexOf(';') + 1));
                    }
                    else {
                        break;
                    }
                }
                des = createInformation(text);
                firstSpace = line.indexOf(' ', line.indexOf('o'));
                spaceOne = line.indexOf(' ', firstSpace + 1);
                length = spaceOne - firstSpace;
                let name = spaceOne > -1 ? cleanLine.substr(cleanLine.indexOf('o') + 1, length - 1) : clearSpace(cleanLine.substring(cleanLine.indexOf('o') + 1));
                des.name = name;
                if (findMacro(name) === undefined) {
                    logInfo.push('added macro ' + name);
                    macros.push(new structs_1.Macro(name, false, des));
                }
            }
            //Is a short macro
            else if (line.includes(" equ")) {
                let v = new structs_1.Info("", "");
                v.des = line.substring(line.indexOf(' ', line.indexOf('equ')));
                var first1 = cleanLine.charAt(0);
                let name = clearSpace(line.substring(line.indexOf(first1), line.indexOf(' ', line.indexOf(first1))));
                v.name = name;
                if (findMacro(name) === undefined) {
                    macros.push(new structs_1.Macro(name, true, v));
                }
            }
            //is line include
            else if (cleanLine.startsWith("include")) {
                var fileName = line.substring(findSpaceIndex(line));
                fileName = fileName.substring(2, fileName.length - 1);
                if (vscode.workspace.rootPath === undefined) {
                    vscode.window.showErrorMessage("no root path");
                    continue;
                }
                fileName = vscode.workspace.rootPath + '\\' + fileName;
                var ext = yield fstream.existsSync(fileName);
                if (!ext || includedFiles.indexOf(fileName) > -1) {
                    continue;
                }
                let filedata = fstream.readFileSync(fileName, 'utf8');
                let doc = filedata.split('\n');
                let name = '/' + fileName;
                while (name.includes('\\')) {
                    name = name.replace('\\', '/');
                }
                includedFiles.push(name);
                yield sacnDoc(doc, false);
            }
        }
        //console.log(structs);
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(2);
            }, 10);
        });
    });
}
function filesInWorkspace() {
    let files = [];
    let path = vscode.workspace.rootPath;
    if (path === undefined) {
        return [];
    }
    if (vscode.window.activeTextEditor === undefined) {
        return [];
    }
    var uri = vscode.window.activeTextEditor.document.uri;
    let allFiles = fstream.readdirSync(path);
    allFiles.forEach(file => {
        var dotEnd = file.lastIndexOf('.');
        if (dotEnd >= 0) {
            if (uri.fsPath !== vscode.workspace.rootPath + "\\" + file) {
                var ext = file.substring(dotEnd + 1);
                if (ext === 'asm') {
                    files.push(file);
                }
            }
        }
    });
    return files;
}
function splitLine(line) {
    let array = [];
    var word = "";
    for (let i = 0; i < line.length; i++) {
        if (lineCutters.indexOf(line[i]) >= 0) {
            word = clearSpace(word);
            if (word.length > 0) {
                array.push(word);
            }
            word = "";
            continue;
        }
        word += line[i];
    }
    // 🚀 แก้บั๊กหั่นคำ: ต้องดันคำสุดท้ายเข้าไปใน Array ด้วย แม้ผู้ใช้จะยังไม่เคาะ Space ก็ตาม
    word = clearSpace(word);
    if (word.length > 0) {
        array.push(word);
    }
    
    return array;
}
function doucmentToStringArray(str) {
    let array = [];
    for (let i = 0; i < str.lineCount; i++) {
        const line = str.lineAt(i);
        array.push(line.text);
    }
    return array;
}
const modernInterrupts = [
    ["21h", "Dos interrupt.", ""],
    ["16h", "Bios interrupt.", ""],
    ["10h", "Graphic interrupt.", ""],
    ["33h", "Mouse interrupt", ""]
];
function matchStructure(name) {
    let out = [];
    for (let i = 0; i < vars.length; i++) {
        const variable = vars[i];
        if (variable.name === name) {
            //if names match show possible outcomes
            for (let j = 0; j < structureInfo.length; j++) {
                const struct = structureInfo[j];
                if (variable.type === struct.name) {
                    for (let q = 0; q < struct.values.length; q++) {
                        const value = struct.values[q];
                        out.push(value);
                    }
                    break;
                }
            }
        }
    }
    return out;
}
class AsmCompiltor {
    getItemKindFromSymbolKind(kind) {
        switch (kind) {
            case enums_1.KeywordType.instruction:
                return vscode.CompletionItemKind.Keyword;
            case enums_1.KeywordType.memoryAllocation:
                return vscode.CompletionItemKind.Keyword;
            case enums_1.KeywordType.precompiled:
                return vscode.CompletionItemKind.Interface;
            case enums_1.KeywordType.register:
                return vscode.CompletionItemKind.Constant;
            case enums_1.KeywordType.savedWord:
                return vscode.CompletionItemKind.Property;
            case enums_1.KeywordType.size:
                return vscode.CompletionItemKind.Constructor;
            case enums_1.KeywordType.variable:
                return vscode.CompletionItemKind.Variable;
            case enums_1.KeywordType.method:
                return vscode.CompletionItemKind.Method;
            case enums_1.KeywordType.structure:
                return vscode.CompletionItemKind.Struct;
            case enums_1.KeywordType.label:
                return vscode.CompletionItemKind.Unit;
            case enums_1.KeywordType.macro:
                return vscode.CompletionItemKind.Color;
            case enums_1.KeywordType.file:
                return vscode.CompletionItemKind.File;
            case enums_1.KeywordType.macroLabel:
                return vscode.CompletionItemKind.TypeParameter;
            default:
                return 0;
        }
    }
    static getKeywordAsDef(name) {
        const lname = name.toLowerCase();
        for (let i = 0; i < keywords_1.KEYWORD_DICONTARY.length; i++) {
            const keyword = keywords_1.KEYWORD_DICONTARY[i];
            if (keyword.name === lname) {
                return keyword;
            }
        }
        return undefined;
    }
    addInterupts() {
        if (this.completions === undefined) {
            return;
        }
        for (let i = 0; i < modernInterrupts.length; i++) {
            const int = modernInterrupts[i];
            let item = new vscode.CompletionItem(int[0], vscode.CompletionItemKind.Reference);
            item.sortText = ("0000" + this.completions.items.length).slice(-4);
            item.documentation = int[2];
            item.detail = "(number) " + int[1];
            this.completions.items.push(item);
        }
    }
    newItemDirect(name, type = enums_1.KeywordType.label, det = '', des = "", ct = ComplitionType.lower) {
        if (this.completions === undefined) {
            return;
        }
        name = complete(name, ct);
        let item = new vscode.CompletionItem(name, this.getItemKindFromSymbolKind(type));
        item.sortText = ("0000" + this.completions.items.length).slice(-4);
        item.documentation = des;
        item.detail = det;
        item.label = name;
        if (type === enums_1.KeywordType.variable) {
            item.insertText = '[' + name + ']';
        }
        // console.log(item);
        this.completions.items.push(item);
    }
    newItemDirectNoExpt(name, type = enums_1.KeywordType.label, det = '', des = "", ct = ComplitionType.lower) {
        if (this.completions === undefined) {
            return;
        }
        name = complete(name, ct);
        let item = new vscode.CompletionItem(name, this.getItemKindFromSymbolKind(type));
        item.sortText = ("0000" + this.completions.items.length).slice(-4);
        item.documentation = des;
        item.detail = det;
        item.label = name;
        // console.log(item);
        this.completions.items.push(item);
    }
    newItemExact(name, type = enums_1.KeywordType.label, det = '', des = "") {
        if (this.completions === undefined) {
            return;
        }
        let item = new vscode.CompletionItem(name, this.getItemKindFromSymbolKind(type));
        item.sortText = ("0000" + this.completions.items.length).slice(-4);
        item.documentation = des;
        item.detail = det;
        item.label = name;
        item.insertText = name; // แทรกชื่อตรงๆ ให้ผู้ใช้พิมพ์ [] หรือ dword[] เอาเองได้ตามใจชอบ
        
        this.completions.items.push(item);
    }
    newItemStructV(name, ct) {
        if (this.completions === undefined) {
            return;
        }
        let item = new vscode.CompletionItem(complete(name, ct), this.getItemKindFromSymbolKind(enums_1.KeywordType.variable));
        item.sortText = ("0000" + this.completions.items.length).slice(-4);
        this.completions.items.push(item);
    }
    newItem(keyword, ct) {
        const def = AsmCompiltor.getKeywordAsDef(keyword);
        if (def === undefined || this.completions === undefined) {
            return;
        }
        let item = new vscode.CompletionItem(complete(def.name, ct), this.getItemKindFromSymbolKind(def.type));
        item.detail = getType(def.type) + " " + def.name;
        item.documentation = def.def;
        item.sortText = ("0000" + this.completions.items.length).slice(-4);
        this.completions.items.push(item);
    }
    newItemFile(name, ct, marked) {
        if (this.completions === undefined) {
            return;
        }
        let item = new vscode.CompletionItem(name, this.getItemKindFromSymbolKind(enums_1.KeywordType.file));
        if (!marked) {
            item.insertText = "\"" + name + "\"";
        }
        else {
            item.insertText = "\"" + name + "\"";
            item.label = name.substring(1);
        }
        item.sortText = ("0000" + this.completions.items.length).slice(-4);
        this.completions.items.push(item);
    }
    provideCompletionItems(document, position, token, context) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.completions = new vscode.CompletionList();
            yield sacnDoc(doucmentToStringArray(document));
            let line = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
            // if (!line) {
            //     return this.completions;
            // }
            let comment = line.match(/^[^\"]*#[^\{].*$/);
            let quotes = line.match(/(\")/g) || line.match(/(\'')/g);
            if (quotes || comment) { // Check if line isn't a comment or string
                return this.completions;
            }
            let words = splitLine(line);
            let isRootLevel = !line.match(/^\s/);
            let column = (position.character > 2) ? (position.character - 2) : 0;
            let posDot = new vscode.Position(position.line, column + 1);
            let posColons = new vscode.Position(position.line, column);
            let wordRange = document.getWordRangeAtPosition(posDot) || document.getWordRangeAtPosition(posColons);
            const current = document.getText(document.getWordRangeAtPosition(position));
            let ct = getComplitionType(current);
            let removeQ = [];
            // Make all the words lowercase to support convertions
            for (let i = 0; i < words.length; i++) {
                words[i] = words[i].toLowerCase();
                if (clearSpace(words[i]).length <= 0) {
                    removeQ.push(i);
                }
            }
            while (removeQ.length > 0) {
                words.splice((_a = removeQ.pop()) !== null && _a !== void 0 ? _a : 0, 1);
            }
            if (words.length > 0 && words[0] === "section") {
                let hasSpace = line.includes(' ') || line.includes('\t');
                
                // 🚀 ถ้าย่อหน้าอยู่ แล้วเริ่มพิมพ์ section ให้โชว์แบบเต็มๆ ล่อไว้เลย
                if (!hasSpace) {
                    this.newItemExact("section .data", enums_1.KeywordType.savedWord, "(Section)", "Initialized data");
                    this.newItemExact("section .text", enums_1.KeywordType.savedWord, "(Section)", "Code section");
                    this.newItemExact("section .bss", enums_1.KeywordType.savedWord, "(Section)", "Uninitialized data");
                    return filter(this.completions); 
                }
                
                // ถ้าเคาะ Space แล้ว ค่อยแนะนำเฉพาะนามสกุล .data, .text
                const sectionNames = ["data", "text", "bss"];
                sectionNames.forEach(sec => {
                    let item = new vscode.CompletionItem("." + sec, vscode.CompletionItemKind.Property);
                    item.detail = "(Section) ." + sec;
                    item.insertText = line.endsWith('.') ? sec : "." + sec; 
                    this.completions.items.push(item);
                });
                return filter(this.completions);
            }
            else if (words.length > 0 && (words[0] === "global" || words[0] === "extern")) {
                let hasSpace = line.includes(' ') || line.includes('\t');
                
                // 🚀 ถ้ากำลังพิมพ์คำว่า global อยู่ (ยังไม่เว้นวรรค) ให้โชว์คำว่า global ค้างไว้
                if (!hasSpace) {
                    this.newItemExact(words[0], enums_1.KeywordType.savedWord, "(Scope)", "Scope definition");
                    return filter(this.completions); 
                }

                // ถ้าเว้นวรรคแล้ว ค่อยแนะนำ Entry Point กับ Label ต่างๆ
                this.newItemExact("_start", enums_1.KeywordType.label, "(Entry)", "Standard execution entry point");
                this.newItemExact("main", enums_1.KeywordType.label, "(Entry)", "C-style main function");
                
                labels.forEach(label => {
                    this.newItemExact(label, enums_1.KeywordType.label, "(Label)", "Defined in this file");
                });
                procs.forEach(proc => {
                    this.newItemExact(proc.name, enums_1.KeywordType.method, "(Procedure)", "Defined in this file");
                });

                return filter(this.completions);
            }
            // --- Section .data ---
            let isDataSection = false;
            for (let i = position.line; i >= 0; i--) {
                let textLine = document.lineAt(i).text.toLowerCase();
                if (textLine.includes(".data") || textLine.includes(".bss")) {
                    isDataSection = true;
                    break;
                } else if (textLine.includes(".text") || textLine.includes(".code")) {
                    break; 
                }
            }

            // ถ้าตรวจสอบแล้วพบว่าอยู่ในโซนข้อมูล
            if (isDataSection) {
                // 🚀 เพิ่มเงื่อนไข: ถ้าไม่ได้พิมพ์ชิดซ้าย (มี Tab/Space ย่อหน้าเข้ามาแล้ว) ถึงจะแนะนำตัวแปร
                if (!isRootLevel) {
                    let trimmedLine = line.trimStart();
                    
                    // ถ้าย่อหน้าว่าง หรือยังไม่มีช่องว่าง/แท็บเลย (กำลังพิมพ์ชื่อตัวแปร)
                    if (trimmedLine.length === 0 || !/[\s\t]/.test(trimmedLine)) {
                        return this.completions; 
                    }
                    
                    // ใช้ Regex เช็คว่า: มีชื่อตัวแปร -> ตามด้วย Space หรือ Tab
                    let match = trimmedLine.match(/^([^\s\t]+)[\s\t]+([^\s\t]*)$/);
                    
                    if (match) {
                        this.newItemDirect("db", enums_1.KeywordType.memoryAllocation, "(Define)", "Define Byte (8-bit)", ct);
                        this.newItemDirect("dw", enums_1.KeywordType.memoryAllocation, "(Define)", "Define Word (16-bit)", ct);
                        this.newItemDirect("dd", enums_1.KeywordType.memoryAllocation, "(Define)", "Define Doubleword (32-bit)", ct);
                        this.newItemDirect("dq", enums_1.KeywordType.memoryAllocation, "(Define)", "Define Quadword (64-bit)", ct);
                        this.newItemDirect("dt", enums_1.KeywordType.memoryAllocation, "(Define)", "Define Tenbytes (80-bit)", ct);
                        this.newItemDirect("equ", enums_1.KeywordType.savedWord, "(Constant)", "Equate", ct);
                        
                        this.newItemDirect("resb", enums_1.KeywordType.memoryAllocation, "(Reserve)", "Reserve Byte", ct);
                        this.newItemDirect("resw", enums_1.KeywordType.memoryAllocation, "(Reserve)", "Reserve Word", ct);
                        this.newItemDirect("resd", enums_1.KeywordType.memoryAllocation, "(Reserve)", "Reserve Doubleword", ct);
                        this.newItemDirect("resq", enums_1.KeywordType.memoryAllocation, "(Reserve)", "Reserve Quadword", ct);

                        return filter(this.completions);
                    }
                    
                    // ถ้าพิมพ์คำสั่ง db เสร็จแล้วเคาะเว้นวรรค ปิดหน้าต่างรบกวน
                    return this.completions; 
                }
                // ถ้า isRootLevel เป็นจริง (พิมพ์ชิดซ้าย) โค้ดจะทะลุผ่านบล็อกนี้ 
                // ลงไปเข้าเงื่อนไขโชว์เมนู Section ด้านล่างอัตโนมัติ
            }
            // --- 🏁 Section .data ---

            // console.log(words);
            if (words.length <= 0) {
                if (isRootLevel) {
                    this.newItemExact("section .data", enums_1.KeywordType.savedWord, "(Section)", "Initialized data");
                    this.newItemExact("section .text", enums_1.KeywordType.savedWord, "(Section)", "Code section");
                    this.newItemExact("section .bss", enums_1.KeywordType.savedWord, "(Section)", "Uninitialized data");
                    this.newItemExact("global", enums_1.KeywordType.savedWord, "(Scope)", "Global symbol");
                    this.newItemExact("extern", enums_1.KeywordType.savedWord, "(Scope)", "External symbol");
                }

                //Show command list
                for (let i = 0; i < keywords_1.KEYWORD_DICONTARY.length; i++) {
                    const word = keywords_1.KEYWORD_DICONTARY[i];
                    if (word.type === enums_1.KeywordType.instruction ||
                        word.type === enums_1.KeywordType.savedWord || word.type === enums_1.KeywordType.precompiled) {
                        // 🚀 กรองคำสั่งกลุ่ม Scope ออก ถ้ามีการเคาะ Tab หรือ Space ไปแล้ว
                        if (!isRootLevel && (word.name === "section" || word.name === "global" || word.name === "extern")) {
                            continue; 
                        }
                        this.newItem(word.name, ct);
                    }
                }
                for (let i = 0; i < macros.length; i++) {
                    const macro = macros[i];
                    if (!macro.short) {
                        this.newItemDirect(macro.name, enums_1.KeywordType.macro, "(Macro) " + macro.name, "", ct);
                    }
                }
            }
            else if (words.length > 0 && context.triggerCharacter === '.') {
                const word = document.getText(wordRange);
                let x = findVar(word);
                if (x !== undefined) {
                    let possibleOutcomes = matchStructure(x.name);
                    for (let i = 0; i < possibleOutcomes.length; i++) {
                        const outcome = possibleOutcomes[i];
                        this.newItemStructV(outcome, getComplitionType(word));
                    }
                }
                return filter(this.completions);
            }
            else if (words.length > 0) {
                //Show registers and variables
                const word = AsmCompiltor.getKeywordAsDef(words[0]);
                if (word === undefined) { // ถ้าระบบยังไม่รู้ว่าเป็นคำสั่งอะไร (กำลังเริ่มพิมพ์)
                    
                    // 🚀 โชว์คำสั่งทั้งหมดให้เลือกเวลาที่เพิ่งพิมพ์อักษรตัวแรกๆ
                    if (words.length === 1) {
                        let isRootLevel = !line.match(/^\s/);
                        if (isRootLevel) {
                            this.newItemExact("section .data", enums_1.KeywordType.savedWord, "(Section)", "Initialized data");
                            this.newItemExact("section .text", enums_1.KeywordType.savedWord, "(Section)", "Code section");
                            this.newItemExact("section .bss", enums_1.KeywordType.savedWord, "(Section)", "Uninitialized data");
                            this.newItemExact("global", enums_1.KeywordType.savedWord, "(Scope)", "Global symbol");
                            this.newItemExact("extern", enums_1.KeywordType.savedWord, "(Scope)", "External symbol");
                        }
                        // แนะนำคำสั่งทั้งหมดที่มีในระบบ
                        for (let i = 0; i < keywords_1.KEYWORD_DICONTARY.length; i++) {
                            const kw = keywords_1.KEYWORD_DICONTARY[i];
                            if (kw.type === enums_1.KeywordType.instruction ||
                                kw.type === enums_1.KeywordType.savedWord || kw.type === enums_1.KeywordType.precompiled) {
                                
                                // ถ้าย่อหน้าเข้ามาแล้ว ให้ซ่อนคำสั่งพวก Section/Global ไป
                                if (!isRootLevel && (kw.name === "section" || kw.name === "global" || kw.name === "extern")) {
                                    continue; 
                                }
                                this.newItem(kw.name, ct);
                            }
                        }
                    }

                    this.newItem("dd", ct);
                    this.newItem("dt", ct);
                    this.newItem("dw", ct);
                    this.newItem("dq", ct);
                    this.newItem("db", ct);
                    this.newItem("equ", ct);
                    for (let i = 0; i < structs.length; i++) {
                        const ss = structs[i];
                        this.newItemDirect(ss, enums_1.KeywordType.structure, "", "", ct);
                    }
                    return filter(this.completions);
                }
                else { // The word is a macro
                    switch (words[0]) {
                        case "proc": // proc defenition
                            if (words.length >= 2) {
                                this.newItemDirect("pascal", enums_1.KeywordType.instruction, "", "", ct);
                                this.newItemDirect("far", enums_1.KeywordType.instruction, "", "", ct);
                                this.newItemDirect("near", enums_1.KeywordType.instruction, "", "", ct);
                                // console.log(this.completions);
                            }
                            return filter(this.completions);
                        case "include": // Show .asm files
                            var files = filesInWorkspace();
                            files.forEach(file => {
                                if (current.startsWith('"')) {
                                    this.newItemFile('"' + file, ct, true);
                                }
                                else {
                                    this.newItemFile(file, ct, false);
                                }
                            });
                            return filter(this.completions);
                        case "arg":
                        case "local":
                            this.newItem("byte", ct);
                            this.newItem("word", ct);
                            this.newItem("dword", ct);
                            this.newItem("qword", ct);
                            return filter(this.completions);
                        case "mov":
                        case "sub":
                        case "add":
                        case "inc":
                        case "dec":
                        case "mul":
                        case "imul":
                        case "div": 
                        case "idiv":
                        case "cmp":
                        case "and":
                        case "or":
                        case "xor":
                        case "test":
                        case "lea":
                            // (ตรวจสอบว่าหาเจอวงเล็บเปิด '[' เป็นตัวล่าสุดก่อนวงเล็บปิด ']')
                            let isInsideBracket = line.lastIndexOf('[') > line.lastIndexOf(']');

                            if (isInsideBracket) {
                                // ถ้าอยู่ในวงเล็บ: ให้แนะนำ "แค่ตัวแปร" อย่างเดียว
                                vars.forEach(element => {
                                    this.newItemExact(element.name, enums_1.KeywordType.variable, "(Variable)", "Data section variable");
                                });
                                return filter(this.completions); // จบการทำงานทันที ไม่ต้องโชว์อย่างอื่น
                            }
                            // กรณีปกติ (ไม่ได้พิมพ์อยู่ในวงเล็บ): แนะนำครบทุกอย่าง
                            keywords_1.REGISTERS.forEach(element => {
                                this.newItem(element, ct);
                            });
                            // แนะนำตัวแปรจาก .data / .bss
                            vars.forEach(element => {
                                this.newItemExact(element.name, enums_1.KeywordType.variable, "(Variable)", "Data section variable");
                            });
                            // แนะนำขนาดข้อมูลสำหรับ YASM (Pointer sizes)
                            this.newItemDirectNoExpt("byte", enums_1.KeywordType.size, "(Size)", "8-bit size", ct);
                            this.newItemDirectNoExpt("word", enums_1.KeywordType.size, "(Size)", "16-bit size", ct);
                            this.newItemDirectNoExpt("dword", enums_1.KeywordType.size, "(Size)", "32-bit size", ct);
                            this.newItemDirectNoExpt("qword", enums_1.KeywordType.size, "(Size)", "64-bit size", ct);
                            
                            return filter(this.completions);

                        case "jmp":
                        case "je":
                        case "jne":
                        case "jz":
                        case "jnz":
                        case "jg":
                        case "jl":
                        case "jge":
                        case "jle":
                        case "ja":
                        case "jb":
                        case "jae":
                        case "jbe":
                        case "call":
                        case "loop":
                            // 1. แนะนำ Labels ทั้งหมดในไฟล์
                            labels.forEach(label => {
                                this.newItemExact(label, enums_1.KeywordType.label, "(Label)", "Jump target");
                            });
                            // 2. แนะนำ Procedures
                            for (let i = 0; i < procs.length; i++) {
                                const proc = procs[i];
                                this.newItemDirect(proc.name, enums_1.KeywordType.method, "(Procedure) " + proc.name, proc.description.des, ct);
                            }
                            return filter(this.completions);
                        case "endp": // Calling function or closing it defenition
                            for (let i = 0; i < procs.length; i++) {
                                const proc = procs[i];
                                this.newItemDirect(proc.name, enums_1.KeywordType.method, "(Procedure) " + proc.name, proc.description.des, ct);
                            }
                            return filter(this.completions);
                        case "endm": // End of macros
                            //Add macros
                            for (let i = 0; i < macros.length; i++) {
                                const macro = macros[i];
                                if (!macro.short) {
                                    this.newItemDirect(macro.name, enums_1.KeywordType.macro, "(Macro) " + macro.name, "", ct);
                                }
                            }
                            return filter(this.completions);
                        case "ends":
                            //Add macros
                            for (let i = 0; i < structs.length; i++) {
                                const macro = structs[i];
                                this.newItemDirect(macro, enums_1.KeywordType.structure, "", "", ct);
                            }
                            return filter(this.completions);
                        case "if":
                        case "ife":
                            //Add variables
                            for (let i = 0; i < vars.length; i++) {
                                const ss = vars[i];
                                if (allowKey(word.allowType, enums_1.KeywordType.variable)) {
                                    this.newItemDirectNoExpt(ss.name, enums_1.KeywordType.variable, "", "", ct);
                                }
                            }
                            for (let i = 0; i < structs.length; i++) {
                                const ss = structs[i];
                                if (allowKey(word.allowType, enums_1.KeywordType.variable)) {
                                    this.newItemDirect(ss, enums_1.KeywordType.structure, "", "", ct);
                                }
                            }
                            return filter(this.completions);
                        case "macro":
                        case "struct": return;
                        default:
                            break;
                    }
                    //Show only variables
                    if (words[2] === "offset") {
                        //Add variables
                        for (let i = 0; i < vars.length; i++) {
                            const ss = vars[i];
                            if (allowKey(word.allowType, enums_1.KeywordType.variable)) {
                                this.newItemDirectNoExpt(ss.name, enums_1.KeywordType.variable, "", "", ct);
                            }
                        }
                        for (let i = 0; i < structs.length; i++) {
                            const ss = structs[i];
                            if (allowKey(word.allowType, enums_1.KeywordType.variable)) {
                                this.newItemDirect(ss, enums_1.KeywordType.structure, "", "", ct);
                            }
                        }
                        return filter(this.completions);
                    }
                    //exit if too much
                    if (word.opCount < words.length) {
                        return;
                    }
                    //Add labels
                    for (let i = 0; i < labels.length; i++) {
                        const ss = labels[i];
                        if (allowKey(word.allowType, enums_1.KeywordType.label)) {
                            this.newItemDirect(ss, enums_1.KeywordType.label, "", "", ct);
                        }
                    }
                    //Add variables
                    for (let i = 0; i < vars.length; i++) {
                        const ss = vars[i];
                        if (allowKey(word.allowType, enums_1.KeywordType.variable)) {
                            this.newItemDirect(ss.name, enums_1.KeywordType.variable, "", "", ct);
                        }
                    }
                    //Add short macros
                    for (let i = 0; i < macros.length; i++) {
                        const ss = macros[i];
                        if (allowKey(word.allowType, enums_1.KeywordType.variable) && ss.short) {
                            this.newItemDirect(ss.name, enums_1.KeywordType.macro, "(Macro) " + ss.name, "", ct);
                        }
                    }
                    //Add macros
                    for (let i = 0; i < macros.length; i++) {
                        const macro = macros[i];
                        if (!macro.short) {
                            this.newItemDirect(macro.name, enums_1.KeywordType.macro, "(Macro) " + macro.name, "", ct);
                        }
                    }
                    //Add keywords
                    for (let i = 0; i < keywords_1.KEYWORD_DICONTARY.length; i++) {
                        const fs = keywords_1.KEYWORD_DICONTARY[i];
                        if (allowKey(word.allowType, fs.type)) {
                            if (!isRootLevel && (fs.name === "section" || fs.name === "global" || fs.name === "extern")) {
                                continue;
                            }
                            this.newItem(fs.name, ct);
                        }
                    }
                }
            }
            return filter(this.completions);
        });
    }
}
function allowKey(allowType, kind) {
    if (allowType === enums_1.AllowKinds.all) {
        return true;
    }
    else if (allowType === enums_1.AllowKinds.inst && (kind === enums_1.KeywordType.register ||
        kind === enums_1.KeywordType.variable || kind === enums_1.KeywordType.structure)) {
        return true;
    }
    else if (allowType === enums_1.AllowKinds.memory && kind === enums_1.KeywordType.register) {
        return true;
    }
    else if (allowType === enums_1.AllowKinds.size && kind === enums_1.KeywordType.size) {
        return true;
    }
    else if (allowType === enums_1.AllowKinds.variables && (kind === enums_1.KeywordType.variable || kind === enums_1.KeywordType.structure)) {
        return true;
    }
    else if (allowType === enums_1.AllowKinds.label && kind === enums_1.KeywordType.label) {
        return true;
    }
    return false;
}
const autoScanDoc = (change) => __awaiter(void 0, void 0, void 0, function* () {
    if (vscode.window.activeTextEditor === undefined) {
        return;
    }
    let doc = yield fstream.readFileSync(vscode.window.activeTextEditor.document.uri.fsPath, 'utf8');
    let fin = doc.split('\n');
    sacnDoc(fin);
});
const autoScanDoc2 = (change) => __awaiter(void 0, void 0, void 0, function* () {
    let fin = doucmentToStringArray(change);
    sacnDoc(fin);
});
const autoScanDoc3 = (change) => __awaiter(void 0, void 0, void 0, function* () {
    if (change === undefined) {
        return;
    }
    let fin = doucmentToStringArray(change.document);
    sacnDoc(fin);
});
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    vscode.workspace.onDidChangeTextDocument((e) => autoScanDoc(e));
    vscode.workspace.onDidOpenTextDocument((e) => autoScanDoc2(e));
    vscode.workspace.onDidSaveTextDocument((e) => autoScanDoc2(e));
    vscode.window.onDidChangeActiveTextEditor((e) => autoScanDoc3(e));
    context.subscriptions.push(vscode.languages.registerHoverProvider('assembly', new TasmHoverProvider()));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(
        'assembly', new AsmCompiltor(), '+', '\n', '-', '.', ' ', '\t', '['
    ));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map