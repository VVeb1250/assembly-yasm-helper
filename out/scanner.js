"use strict";
const vscode = require("vscode");
const fstream = require("fs");
const { Utils } = require("./utils");
const { Info, Procedure, Label } = require("./data/structs");

class DocumentScanner {
    constructor(registry) {
        this.registry = registry;
        this.currentSection = ""; // add Section tracking
    }

    async scan(documentLines, clearPrevious = true) {
        if (clearPrevious) {
            this.registry.clear();
            if (vscode.window.activeTextEditor) {
                this.registry.includedFiles.push(vscode.window.activeTextEditor.document.uri.path);
            }
        }

        this.currentSection = ""; // reset Section when rescan

        for (let x = 0; x < documentLines.length; x++) {
            const line = documentLines[x];
            const cleanLine = Utils.clearSpace(line);
            const lowerCleanLine = cleanLine.toLowerCase();

            // ==========================================
            // 1. Section change detector
            // ==========================================
            if (lowerCleanLine.startsWith("section") || lowerCleanLine.startsWith("segment")) {
                let words = Utils.splitLine(line);
                if (words.length > 1) {
                    this.currentSection = words[1].toLowerCase(); // ex. ".data", ".text", ".bss"
                }
                continue; // read next line
            }

            // ==========================================
            // 2. find Labels
            // ==========================================
            if (line.endsWith(':')) {
                let labelName = Utils.clearSpace(line.substring(0, line.length - 1));
                this.registry.labels.push(labelName);
            }
            if (lowerCleanLine.startsWith('label')) {
                let firstSpace = line.indexOf(' ', line.indexOf('l'));
                let spaceOne = line.indexOf(' ', firstSpace + 1);
                let length = spaceOne - firstSpace;
                let name = cleanLine.substr(firstSpace, length - 1);
                this.registry.labelsEE.push(new Label(name, line.substring(line.indexOf(' ', line.indexOf(name)))));
            }

            // ==========================================
            // 3. detect Variables (and record Section)
            // ==========================================
            // add resb, resw, resd, resq for .bss
            let isVar = lowerCleanLine.includes("db") || lowerCleanLine.includes("dw") || 
                        lowerCleanLine.includes("dd") || lowerCleanLine.includes("dq") || 
                        lowerCleanLine.includes("dt") || lowerCleanLine.includes("resb") ||
                        lowerCleanLine.includes("resw") || lowerCleanLine.includes("resd") ||
                        lowerCleanLine.includes("resq") || 
                        this.registry.structs.some(s => line.includes(s));

            if (isVar && clearPrevious) {
                let first = cleanLine.charAt(0);
                let fistInd = line.indexOf(first);
                let space1 = line.indexOf(' ', fistInd) > -1 ? line.indexOf(' ', fistInd) : line.indexOf('\t', fistInd);
                let space2 = line.indexOf(' ', space1 + 1) > -1 ? line.indexOf(' ', space1 + 1) : line.indexOf('\t', space1 + 1);
                
                if (space1 > -1 && space2 > -1) {
                    this.registry.vars.push({
                        name: Utils.clearSpace(line.substring(fistInd, space1)),
                        type: Utils.clearSpace(line.substring(space1, space2)),
                        section: this.currentSection // <--- add Section of variable
                    });
                }
            }

            // ==========================================
            // 4. detect Procedures
            // ==========================================
            if (lowerCleanLine.startsWith("proc")) {
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

                if (!this.registry.findProcedure(name)) {
                    let proc = new Procedure(name, des);
                    proc.section = this.currentSection; // <--- add Section for Procedure
                    this.registry.procs.push(proc);
                }
            }

            // ==========================================
            // 5. detect Includes
            // ==========================================
            if (lowerCleanLine.startsWith("include")) {
                let fileNameMatch = line.match(/['"](.*?)['"]/);
                if (fileNameMatch && vscode.workspace.workspaceFolders) {
                    let fileName = vscode.workspace.workspaceFolders[0].uri.fsPath + '\\' + fileNameMatch[1];
                    if (fstream.existsSync(fileName) && !this.registry.includedFiles.includes(fileName)) {
                        let filedata = fstream.readFileSync(fileName, 'utf8');
                        this.registry.includedFiles.push(fileName.replace(/\\/g, '/'));
                        
                        // save current Section, cuz include may change Section
                        let oldSection = this.currentSection;
                        
                        await this.scan(filedata.split('\n'), false);
                        
                        // return Section for main file
                        this.currentSection = oldSection; 
                    }
                }
            }
        }
    }
}

module.exports = { DocumentScanner };