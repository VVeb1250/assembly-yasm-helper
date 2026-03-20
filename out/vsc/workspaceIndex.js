"use strict";
const vscode = require("vscode");
const fs     = require("fs");
const path   = require("path");

/**
 * Per-file cache of `global` symbols across the workspace.
 * Stores { name, line } so definition provider can jump to the exact line.
 */
class WorkspaceIndex {
    constructor() {
        this._fileSymbols = new Map(); // absPath → { name, line }[]
        this._watcher     = null;
    }

    async activate(context) {
        const files = await vscode.workspace.findFiles(
            '**/*.{asm,s,S}',
            '{**/node_modules/**,**/.git/**}'
        );
        await Promise.all(files.map(f => this._indexFile(f.fsPath)));

        this._watcher = vscode.workspace.createFileSystemWatcher('**/*.{asm,s,S}');
        this._watcher.onDidChange(e => this._indexFile(e.fsPath));
        this._watcher.onDidCreate(e => this._indexFile(e.fsPath));
        this._watcher.onDidDelete(e => this._fileSymbols.delete(path.normalize(e.fsPath)));

        context.subscriptions.push(this._watcher);
        context.subscriptions.push(this);
    }

    async _indexFile(filePath) {
        try {
            const text = fs.readFileSync(filePath, 'utf8');
            this._fileSymbols.set(path.normalize(filePath), _extractGlobals(text));
        } catch {}
    }

    /**
     * Returns global symbols declared in all files except currentFilePath.
     * Excludes `_start` (entry point, not a reusable extern target).
     * @returns {{ name: string, file: string, filePath: string, line: number }[]}
     */
    getExternSuggestions(currentFilePath) {
        const norm    = path.normalize(currentFilePath);
        const results = [];
        for (const [fp, syms] of this._fileSymbols) {
            if (fp === norm) continue;
            const label = path.basename(fp);
            for (const s of syms) {
                if (s.name === '_start') continue;
                results.push({ name: s.name, file: label, filePath: fp, line: s.line });
            }
        }
        return results;
    }

    /**
     * Find all definition locations for a symbol across all indexed files.
     * @param {string} symbolName
     * @returns {{ filePath: string, line: number }[]}
     */
    findAllDefinitions(symbolName) {
        const key     = symbolName.toLowerCase();
        const results = [];
        for (const [fp, syms] of this._fileSymbols) {
            const found = syms.find(s => s.name.toLowerCase() === key);
            if (found) results.push({ filePath: fp, line: found.line });
        }
        return results;
    }

    dispose() {
        if (this._watcher) this._watcher.dispose();
    }
}

/**
 * Extract all `global`-declared symbols from raw file text.
 * For each symbol, resolve the line to the label definition (name:) if found,
 * otherwise fall back to the `global` declaration line.
 * @returns {{ name: string, line: number }[]}
 */
function _extractGlobals(text) {
    const lines   = text.split(/\r?\n/);
    const globals = new Map(); // name_lower → { name, line }
    const labels  = new Map(); // name_lower → line

    for (let i = 0; i < lines.length; i++) {
        const noComment = lines[i].replace(/;.*$/, '').trim();

        if (/^global\b/i.test(noComment)) {
            for (const part of noComment.slice(6).split(/[\s,]+/)) {
                const s = part.trim();
                if (s && !globals.has(s.toLowerCase()))
                    globals.set(s.toLowerCase(), { name: s, line: i });
            }
        }

        const m = noComment.match(/^([A-Za-z_.$?][\w.$?]*):/);
        if (m) labels.set(m[1].toLowerCase(), i);
    }

    return [...globals.values()].map(g => ({
        name: g.name,
        line: labels.has(g.name.toLowerCase()) ? labels.get(g.name.toLowerCase()) : g.line,
    }));
}

module.exports = { WorkspaceIndex };
