"use strict";
const vscode = require("vscode");
const path   = require("path");
const fs     = require("fs");
const cp     = require("child_process");

class RunProvider {
    constructor() {
        this._terminal = null;
        this._debugTerminal = null;
    }

    async buildAndRun(document, workspaceIndex = null) {
        const config       = vscode.workspace.getConfiguration('assembly');
        const compilerType = config.get('compilerType', 'yasm');
        const debugInfo    = config.get('compilerDebugInfo', 'none');
        const outputExt    = config.get('outputExtension', 'o');

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

        const build = await _resolveBuild(document.uri.fsPath, document.getText(), workspaceIndex, config);
        if (!build) return; // user cancelled quick pick

        const { allFiles, exeFile, entryPoint, format, linkerFlags } = build;

        const asmCmds = [], objFiles = [];
        for (const fp of allFiles) {
            const objFile = fp.replace(/\.[^.]+$/, `.${outputExt}`);
            const args = [`-f${format}`];
            if (debugInfo !== 'none') args.push(`-g${debugInfo}`);
            args.push(_q(fp), '-o', _q(objFile));
            asmCmds.push(`${_q(compilerPath)} ${args.join(' ')}`);
            objFiles.push(_q(objFile));
        }

        const ldExtra = linkerFlags.length ? ' ' + linkerFlags.join(' ') : '';
        const ldCmd   = `${_q(linkerPath)} ${objFiles.join(' ')} -o ${_q(exeFile)} -e${entryPoint}${ldExtra}`;
        const runCmd  = _q(exeFile);

        const fullCmd = [...asmCmds, ldCmd, runCmd].join(' && \\\n  ');
        const label = allFiles.map(f => path.basename(f)).join(' + ');
        vscode.window.setStatusBarMessage(`$(sync~spin) Building: ${label}`, 8000);
        this._getTerminal().sendText(fullCmd);
        this._getTerminal().show(true);
    }

    async debugWithDDD(document, workspaceIndex = null) {
        const config       = vscode.workspace.getConfiguration('assembly');
        const compilerType = config.get('compilerType', 'yasm');
        const debugInfo    = config.get('compilerDebugInfo', 'dwarf2');
        const outputExt    = config.get('outputExtension', 'o');
        const dddDebugger  = config.get('dddDebugger', '');

        // Force debug symbols — ddd is useless without them
        const effectiveDebugInfo = debugInfo === 'none' ? 'dwarf2' : debugInfo;

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

        let dddPath = config.get('dddPath', '');
        if (!dddPath) dddPath = await _findExe('ddd');
        if (!dddPath) {
            vscode.window.showErrorMessage(`'ddd' not found. Install ddd or set 'assembly.dddPath' in settings.`);
            return;
        }

        const build = await _resolveBuild(document.uri.fsPath, document.getText(), workspaceIndex, config);
        if (!build) return;

        const { allFiles, exeFile, entryPoint, format, linkerFlags } = build;

        const asmCmds = [], objFiles = [];
        for (const fp of allFiles) {
            const objFile = fp.replace(/\.[^.]+$/, `.${outputExt}`);
            const args = [`-f${format}`, `-g${effectiveDebugInfo}`];
            args.push(_q(fp), '-o', _q(objFile));
            asmCmds.push(`${_q(compilerPath)} ${args.join(' ')}`);
            objFiles.push(_q(objFile));
        }

        const ldExtra = linkerFlags.length ? ' ' + linkerFlags.join(' ') : '';
        const ldCmd   = `${_q(linkerPath)} ${objFiles.join(' ')} -o ${_q(exeFile)} -e${entryPoint}${ldExtra}`;
        const debuggerFlag = dddDebugger ? ` --debugger ${dddDebugger}` : '';
        const runCmd  = `${_q(dddPath)}${debuggerFlag} ${_q(exeFile)}`;

        const fullCmd = [...asmCmds, ldCmd, runCmd].join(' && \\\n  ');
        const label = allFiles.map(f => path.basename(f)).join(' + ');
        vscode.window.setStatusBarMessage(`$(sync~spin) Debugging: ${label}`, 8000);
        this._getDebugTerminal().sendText(fullCmd);
        this._getDebugTerminal().show(true);
    }

    async createConfig(document, workspaceIndex) {
        const srcFile  = document.uri.fsPath;
        const dir      = path.dirname(srcFile);
        const base     = path.basename(srcFile, path.extname(srcFile));
        const depFiles = _resolveDeps(document.getText(), srcFile, workspaceIndex);
        const sources  = [
            path.basename(srcFile),
            ...depFiles.map(f => path.relative(dir, f).replace(/\\/g, '/'))
        ];

        const cfg = {
            entry:       path.basename(srcFile),
            sources,
            output:      base,
            format:      "elf64",
            entryPoint:  "_start",
            linkerFlags: []
        };

        const configPath = path.join(dir, 'asmconfig.json');

        if (fs.existsSync(configPath)) {
            const answer = await vscode.window.showWarningMessage(
                'asmconfig.json already exists. Overwrite?', 'Yes', 'No'
            );
            if (answer !== 'Yes') return;
        }

        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(configPath));
        await vscode.window.showTextDocument(doc);
    }

    _getTerminal() {
        if (!this._terminal || this._terminal.exitStatus !== undefined) {
            this._terminal = vscode.window.createTerminal('Assembly Run');
        }
        return this._terminal;
    }

    _getDebugTerminal() {
        if (!this._debugTerminal || this._debugTerminal.exitStatus !== undefined) {
            this._debugTerminal = vscode.window.createTerminal('Assembly Debug');
        }
        return this._debugTerminal;
    }

    dispose() {
        if (this._terminal) this._terminal.dispose();
        if (this._debugTerminal) this._debugTerminal.dispose();
    }
}

/**
 * Resolve build targets from asmconfig.json (if present) or extern auto-detect.
 * Returns { allFiles, exeFile, entryPoint, format, linkerFlags } or null if cancelled.
 */
async function _resolveBuild(srcFile, text, workspaceIndex, vsConfig) {
    const cfgPath = await _findAsmConfig(srcFile);

    if (cfgPath) {
        const cfg = _loadAsmConfig(cfgPath);
        if (!cfg) {
            vscode.window.showWarningMessage('Failed to parse asmconfig.json');
            return null;
        }
        const cfgDir   = path.dirname(cfgPath);
        const sources  = cfg.sources || (cfg.entry ? [cfg.entry] : [path.basename(srcFile)]);
        const allFiles = sources.map(s => path.resolve(cfgDir, s));
        const outName  = cfg.output || path.basename(allFiles[0], path.extname(allFiles[0]));
        return {
            allFiles,
            exeFile:     path.join(cfgDir, outName),
            entryPoint:  cfg.entryPoint  || vsConfig.get('entryPoint', '_start'),
            format:      cfg.format      || vsConfig.get('compilerFormat', 'elf64'),
            linkerFlags: cfg.linkerFlags || []
        };
    }

    // Auto-detect from extern declarations
    const dir      = path.dirname(srcFile);
    const base     = path.basename(srcFile, path.extname(srcFile));
    const depFiles = _resolveDeps(text, srcFile, workspaceIndex);

    let selectedDeps = depFiles;
    if (depFiles.length > 0) {
        const items = depFiles.map(f => ({
            label:       path.basename(f),
            description: path.relative(dir, f),
            fsPath:      f,
            picked:      true
        }));
        const picked = await vscode.window.showQuickPick(items, {
            canPickMany:  true,
            placeHolder:  `Building: ${path.basename(srcFile)} — select additional files`
        });
        if (picked === undefined) return null; // user cancelled
        selectedDeps = picked.map(i => i.fsPath);
    }

    return {
        allFiles:    [srcFile, ...selectedDeps],
        exeFile:     path.join(dir, base),
        entryPoint:  vsConfig.get('entryPoint', '_start'),
        format:      vsConfig.get('compilerFormat', 'elf64'),
        linkerFlags: []
    };
}

/**
 * Find the closest asmconfig.json to currentFilePath.
 * Prefers configs in ancestor directories (closest wins).
 * If multiple non-ancestor configs exist, shows quick pick.
 * Returns config file path or null if none found / user cancelled.
 */
async function _findAsmConfig(currentFilePath) {
    const uris = await vscode.workspace.findFiles('**/asmconfig.json', '**/{node_modules,.git}/**');
    if (uris.length === 0) return null;

    const currentDir = path.normalize(path.dirname(currentFilePath));

    // Find closest ancestor config (deepest path that is prefix of currentDir)
    let best = null, bestDepth = -1;
    for (const uri of uris) {
        const cfgDir = path.normalize(path.dirname(uri.fsPath));
        if (currentDir === cfgDir || currentDir.startsWith(cfgDir + path.sep)) {
            const depth = cfgDir.split(path.sep).length;
            if (depth > bestDepth) { best = uri.fsPath; bestDepth = depth; }
        }
    }
    if (best) return best;

    // No ancestor config — if only one in workspace, use it; else quick pick
    if (uris.length === 1) return uris[0].fsPath;

    const items = uris.map(u => ({
        label:       path.join(path.basename(path.dirname(u.fsPath)), 'asmconfig.json'),
        description: u.fsPath,
        fsPath:      u.fsPath
    }));
    const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select project to build' });
    return picked ? picked.fsPath : null;
}

function _loadAsmConfig(configPath) {
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return null;
    }
}

function _resolveDeps(text, currentFilePath, workspaceIndex) {
    if (!workspaceIndex) return [];
    const norm = path.normalize(currentFilePath);
    const dir  = path.dirname(norm);
    const syms = _extractExterns(text);
    const files = new Set();
    for (const sym of syms) {
        for (const def of workspaceIndex.findAllDefinitions(sym)) {
            if (def.filePath !== norm &&
                path.dirname(path.normalize(def.filePath)) === dir)
            {
                files.add(def.filePath);
            }
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
