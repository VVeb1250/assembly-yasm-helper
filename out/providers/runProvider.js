"use strict";
const vscode = require("vscode");
const path   = require("path");
const cp     = require("child_process");

class RunProvider {
    constructor() {
        this._terminal = null;
    }

    async buildAndRun(document) {
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
            vscode.window.showErrorMessage(
                `Linker 'ld' not found. Set 'assembly.linkerPath' in settings.`
            );
            return;
        }

        const srcFile  = document.uri.fsPath;
        const dir      = path.dirname(srcFile);
        const base     = path.basename(srcFile, path.extname(srcFile));
        const objFile  = path.join(dir, `${base}.${outputExt}`);
        const exeFile  = path.join(dir, base);

        // Build assembler args
        const asmArgs = [`-f${format}`];
        if (debugInfo !== 'none') asmArgs.push(`-g${debugInfo}`);
        asmArgs.push(`"${srcFile}"`, '-o', `"${objFile}"`);

        // Build linker args
        const ldArgs  = [`"${objFile}"`, '-o', `"${exeFile}"`, `-e${entryPoint}`];

        const q    = (s) => s.includes(' ') ? `"${s}"` : s;
        const asmCmd = `${q(compilerPath)} ${asmArgs.join(' ')}`;
        const ldCmd  = `${q(linkerPath)} ${ldArgs.join(' ')}`;
        const runCmd = `"${exeFile}"`;

        const fullCmd = `${asmCmd} && ${ldCmd} && ${runCmd}`;

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
