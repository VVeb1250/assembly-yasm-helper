"use strict";
const vscode = require("vscode");
const fstream = require("fs");
const { Utils } = require("./utils");
const { Info, Procedure, Label } = require("./data/structs");

class DocumentScanner {
    constructor(registry) {
        this.registry = registry;
    }

    async scan(documentLines, clearPrevious = true) {
        if (clearPrevious) {
            this.registry.clear();
            if (vscode.window.activeTextEditor) {
                this.registry.includedFiles.push(vscode.window.activeTextEditor.document.uri.path);
            }
        }

        for (let x = 0; x < documentLines.length; x++) {
            const line = documentLines[x];
            const cleanLine = Utils.clearSpace(line);

            if (line.endsWith(':')) {
                this.registry.labels.push(Utils.clearSpace(line.substring(0, line.length - 1)));
            }
            if (cleanLine.startsWith('label')) {
                let firstSpace = line.indexOf(' ', line.indexOf('l'));
                let spaceOne = line.indexOf(' ', firstSpace + 1);
                let length = spaceOne - firstSpace;
                let name = cleanLine.substr(firstSpace, length - 1);
                this.registry.labelsEE.push(new Label(name, line.substring(line.indexOf(' ', line.indexOf(name)))));
            }

            let isVar = line.includes(" db") || line.includes(" dw") || line.includes(" dd") || line.includes(" dq") || line.includes(" dt");
            if (isVar && clearPrevious) {
                let first = cleanLine.charAt(0);
                let fistInd = line.indexOf(first);
                let space1 = line.indexOf(' ', fistInd) > -1 ? line.indexOf(' ', fistInd) : line.indexOf('\t', fistInd);
                let space2 = line.indexOf(' ', space1 + 1) > -1 ? line.indexOf(' ', space1 + 1) : line.indexOf('\t', space1 + 1);
                
                if (space1 > -1 && space2 > -1) {
                    this.registry.vars.push({
                        name: Utils.clearSpace(line.substring(fistInd, space1)),
                        type: Utils.clearSpace(line.substring(space1, space2))
                    });
                }
            }

            if (cleanLine.startsWith("proc")) {
                let des = new Info("", "");
                let text = [];
                let ptr = x;
                while (ptr - 1 >= 0) {
                    ptr--;
                    if (Utils.clearSpace(documentLines[ptr]).startsWith(';')) {
                        text.push(documentLines[ptr].substring(documentLines[ptr].indexOf(';') + 1));
                    } else break;
                }
                
                for (let t of text) {
                    if (t.startsWith("@out: ")) des.output.push(t.substring(t.indexOf(' ', t.indexOf('@out: '))));
                    else if (t.startsWith("@arg: ")) des.params.push(Utils.clearSpace(t.substring(t.indexOf(' ', t.indexOf('@arg: ')))));
                    else des.des += t;
                }

                let firstSpace = line.indexOf(' ', line.indexOf('c'));
                let spaceOne = line.indexOf(' ', firstSpace + 1);
                let name = spaceOne > -1 ? cleanLine.substr(cleanLine.indexOf('c') + 1, spaceOne - firstSpace - 1) : cleanLine.substring(cleanLine.indexOf('c') + 1);
                des.name = name;
                if (!this.registry.findProcedure(name)) this.registry.procs.push(new Procedure(name, des));
            }
        }
    }
}

module.exports = { DocumentScanner };