"use strict";
const vscode = require("vscode");
const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

class CompilerProvider {
    constructor() {
        this.collection = vscode.languages.createDiagnosticCollection("assembly-compiler");

        // status bar item
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBar.show();
    }

    // ==========================================
    // Public: analyze document using compiler
    // ==========================================
    async analyze(document) {
        const config = vscode.workspace.getConfiguration('assembly');
        const enabled        = config.get('enableCompilerCheck', false);
        const compilerType   = config.get('compilerType', 'yasm');
        const compilerFormat = config.get('compilerFormat', 'elf64');
        const debugInfo      = config.get('compilerDebugInfo', 'dwarf2');
        const outputExt      = config.get('outputExtension', 'o');

        if (!enabled) {
            this.collection.delete(document.uri);
            this.statusBar.text = '';
            return;
        }

        // หา compiler path จาก settings หรือหาเองอัตโนมัติ
        let compilerPath = config.get('compilerPath', '');
        if (!compilerPath) {
            compilerPath = await this._findCompiler(compilerType);
        }

        if (!compilerPath) {
            this.collection.delete(document.uri);
            this.statusBar.text = `$(warning) ${compilerType.toUpperCase()}: compiler not found`;
            this.statusBar.tooltip = `Install ${compilerType} or set 'assembly.compilerPath' in settings`;
            return;
        }

        // ตรวจว่า compiler มีอยู่จริง
        if (!fs.existsSync(compilerPath)) {
            this.statusBar.text = `$(warning) ${compilerType.toUpperCase()}: not found at '${compilerPath}'`;
            this.statusBar.tooltip = `Check 'assembly.compilerPath' in settings`;
            return;
        }

        this.statusBar.text = `$(sync~spin) ${compilerType.toUpperCase()}: compiling...`;
        const diagnostics = await this._runCompiler(document, compilerPath, compilerType, compilerFormat, debugInfo, outputExt);
        this.collection.set(document.uri, diagnostics);

        if (diagnostics.length === 0) {
            this.statusBar.text = `$(check) ${compilerType.toUpperCase()}: ok`;
        } else {
            const errors   = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
            const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
            this.statusBar.text = `$(error) ${compilerType.toUpperCase()}: ${errors} error(s), ${warnings} warning(s)`;
        }
    }

    // ==========================================
    // Run compiler and parse output
    // ==========================================
    async _runCompiler(document, compilerPath, compilerType, compilerFormat, debugInfo, outputExt) {
        const tmpFile = path.join(os.tmpdir(), `asm_check_${Date.now()}.asm`);
        try {
            fs.writeFileSync(tmpFile, document.getText(), 'utf8');
        } catch (e) {
            return [];
        }

        const args = this._buildArgs(compilerType, tmpFile, compilerFormat, debugInfo, outputExt);
        const outputFile = tmpFile.replace('.asm', `.${outputExt}`);

        return new Promise((resolve) => {
            cp.execFile(compilerPath, args, { timeout: 10000 }, (err, stdout, stderr) => {
                // cleanup temp files
                fs.unlink(tmpFile, () => {});
                fs.unlink(outputFile, () => {});

                if (!err) {
                    resolve([]);
                    return;
                }

                const output = stderr || stdout || "";
                const diagnostics = compilerType === 'nasm'
                    ? this._parseNasm(output, tmpFile)
                    : this._parseYasm(output, tmpFile);

                resolve(diagnostics);
            });
        });
    }

    // ==========================================
    // Build compiler arguments
    // ==========================================
    _buildArgs(compilerType, inputFile, format, debugInfo, outputExt) {
        const outputFile = inputFile.replace('.asm', `.${outputExt}`);
        const args = [`-f${format}`, inputFile, "-o", outputFile];
        if (debugInfo !== 'none') args.splice(1, 0, `-g${debugInfo}`);
        return args;
    }

    // ==========================================
    // Parse YASM error output
    // Format: filename.asm:line: error: message
    // ==========================================
    _parseYasm(output, tmpFile) {
        const diagnostics = [];
        const tmpName = path.basename(tmpFile);

        for (const line of output.split('\n')) {
            // ตัวอย่าง: /tmp/asm_check_123.asm:10: error: ...
            const match = line.match(/^.*?:(\d+):\s*(error|warning|note):\s*(.+)$/i);
            if (!match) continue;

            const lineNum = parseInt(match[1]) - 1; // VS Code ใช้ 0-based
            const severity = match[2].toLowerCase() === 'warning'
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Error;
            const message = match[3].trim();

            diagnostics.push(this._makeDiagnostic(lineNum, message, severity, "YASM"));
        }
        return diagnostics;
    }

    // ==========================================
    // Parse NASM error output
    // Format: filename.asm:line: error: message
    // ==========================================
    _parseNasm(output, tmpFile) {
        const diagnostics = [];

        for (const line of output.split('\n')) {
            // ตัวอย่าง: /tmp/asm_check_123.asm:10: error: ...
            const match = line.match(/^.*?:(\d+):\s*(error|warning|note):\s*(.+)$/i);
            if (!match) continue;

            const lineNum = parseInt(match[1]) - 1;
            const severity = match[2].toLowerCase() === 'warning'
                ? vscode.DiagnosticSeverity.Warning
                : vscode.DiagnosticSeverity.Error;
            const message = match[3].trim();

            diagnostics.push(this._makeDiagnostic(lineNum, message, severity, "NASM"));
        }
        return diagnostics;
    }

    // ==========================================
    // Helper
    // ==========================================
    _makeDiagnostic(lineNum, message, severity, source) {
        const safeLineNum = Math.max(0, lineNum);
        const range = new vscode.Range(safeLineNum, 0, safeLineNum, Number.MAX_SAFE_INTEGER);
        const diag = new vscode.Diagnostic(range, message, severity);
        diag.source = source; // แสดงว่า error มาจาก YASM/NASM
        return diag;
    }

    // ==========================================
    // Auto-find compiler using which/where
    // ==========================================
    async _findCompiler(compilerType) {
        const cmd = process.platform === 'win32' ? 'where' : 'which';
        return new Promise((resolve) => {
            cp.exec(`${cmd} ${compilerType}`, (err, stdout) => {
                if (err || !stdout.trim()) { resolve(''); return; }
                resolve(stdout.trim().split('\n')[0].trim());
            });
        });
    }

    dispose() {
        this.collection.dispose();
        this.statusBar.dispose();
    }
}

module.exports = { CompilerProvider };