"use strict";
const vscode = require("vscode");
const path   = require("path");
const cp     = require("child_process");

class RunProvider {
    constructor() {
        this._terminal = null;
    }

    async buildAndRun(document, workspaceIndex = null) {
        const config       = vscode.workspace.getConfiguration('assembly');
        const compilerType = config.get('compilerType', 'yasm');
        const format       = config.get('compilerFormat', 'elf64');
        const debugInfo    = config.get('compilerDebugInfo', 'none');
        const outputExt    = config.get('outputExtension', 'o');
        const entryPoint   = config.get('entryPoint', '_start');

        let compilerPath = config.get('compilerPath', '');
        if (!compilerPath) compilerPath = await _findExe(compilerType);
        if (!compilerPath) {
            vscode.window.showErrorMessage(
                `${compilerType.toUpperCase()} not found. Set 'assembly.compilerPath' in settings.`
            );
            return;
        }

        let linkerPath = config.get('linkerPath', '');
        if (!linkerPath) linkerPath = await _findExe('ld');
        if (!linkerPath) {
            vscode.window.showErrorMessage(`Linker 'ld' not found. Set 'assembly.linkerPath' in settings.`);
            return;
        }

        const srcFile = document.uri.fsPath;
        const dir     = path.dirname(srcFile);
        const base    = path.basename(srcFile, path.extname(srcFile));

        // Resolve dependency files from extern declarations
        const depFiles = _resolveDeps(document.getText(), srcFile, workspaceIndex);
        const allFiles = [srcFile, ...depFiles]; // current file first

        // Assemble each file
        const asmCmds = [];
        const objFiles = [];
        for (const fp of allFiles) {
            const objFile = fp.replace(/\.[^.]+$/, `.${outputExt}`);
            const args = [`-f${format}`];
            if (debugInfo !== 'none') args.push(`-g${debugInfo}`);
            args.push(_q(fp), '-o', _q(objFile));
            asmCmds.push(`${_q(compilerPath)} ${args.join(' ')}`);
            objFiles.push(_q(objFile));
        }

        const exeFile = path.join(dir, base);
        const ldCmd   = `${_q(linkerPath)} ${objFiles.join(' ')} -o ${_q(exeFile)} -e${entryPoint}`;
        const runCmd  = _q(exeFile);

        const fullCmd = [...asmCmds, ldCmd, runCmd].join(' && \\\n  ');

        this._getTerminal().sendText(fullCmd);
        this._getTerminal().show(true);
    }

    _getTerminal() {
        if (!this._terminal || this._terminal.exitStatus !== undefined) {
            this._terminal = vscode.window.createTerminal('Assembly Run');
        }
        return this._terminal;
    }

    dispose() {
        if (this._terminal) this._terminal.dispose();
    }
}

/**
 * Parse `extern` declarations from file text, resolve each symbol to its
 * source file via workspaceIndex, return unique dependency file paths.
 */
function _resolveDeps(text, currentFilePath, workspaceIndex) {
    if (!workspaceIndex) return [];

    const norm  = path.normalize(currentFilePath);
    const syms  = _extractExterns(text);
    const files = new Set();

    for (const sym of syms) {
        for (const def of workspaceIndex.findAllDefinitions(sym)) {
            if (def.filePath !== norm) files.add(def.filePath);
        }
    }
    return [...files];
}

function _extractExterns(text) {
    const syms = new Set();
    for (const line of text.split(/\r?\n/)) {
        const noComment = line.replace(/;.*$/, '').trim();
        if (!/^extern\b/i.test(noComment)) continue;
        for (const part of noComment.slice(6).split(/[\s,]+/)) {
            const s = part.trim();
            if (s) syms.add(s);
        }
    }
    return [...syms];
}

function _q(s) {
    return s.includes(' ') ? `"${s}"` : s;
}

async function _findExe(name) {
    const cmd = process.platform === 'win32' ? `where ${name}` : `which ${name}`;
    return new Promise((resolve) => {
        cp.exec(cmd, (err, stdout) => {
            if (err || !stdout.trim()) { resolve(''); return; }
            resolve(stdout.trim().split('\n')[0].trim());
        });
    });
}

module.exports = { RunProvider };
