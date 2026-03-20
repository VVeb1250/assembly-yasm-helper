"use strict";

const cp   = require("child_process");
const fs   = require("fs");
const path = require("path");
const os   = require("os");

/**
 * Run YASM/NASM compiler and return plain diagnostic objects.
 * @param {{ compilerPath: string, compilerType: string, compilerFormat: string, debugInfo: string, outputExt: string, documentText: string }} config
 * @returns {Promise<{ line: number, message: string, severity: 'error'|'warning', source: string }[]>}
 */
async function runCompiler(config) {
    const { compilerPath, compilerType, compilerFormat, debugInfo, outputExt, documentText } = config;

    const tmpFile = path.join(os.tmpdir(), `asm_check_${Date.now()}.asm`);
    try {
        fs.writeFileSync(tmpFile, documentText, 'utf8');
    } catch (e) {
        return [];
    }

    const args       = _buildArgs(compilerType, tmpFile, compilerFormat, debugInfo, outputExt);
    const outputFile = tmpFile.replace('.asm', `.${outputExt}`);

    return new Promise((resolve) => {
        cp.execFile(compilerPath, args, { timeout: 10000 }, (err, stdout, stderr) => {
            fs.unlink(tmpFile, () => {});
            fs.unlink(outputFile, () => {});

            if (!err) { resolve([]); return; }

            const output = stderr || stdout || "";
            const diags  = compilerType === 'nasm'
                ? _parseOutput(output, 'NASM')
                : _parseOutput(output, 'YASM');

            resolve(diags);
        });
    });
}

/**
 * Auto-find compiler using which/where.
 * @param {string} compilerType
 * @returns {Promise<string>}
 */
async function findCompiler(compilerType) {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    return new Promise((resolve) => {
        cp.exec(`${cmd} ${compilerType}`, (err, stdout) => {
            if (err || !stdout.trim()) { resolve(''); return; }
            resolve(stdout.trim().split('\n')[0].trim());
        });
    });
}

function _buildArgs(compilerType, inputFile, format, debugInfo, outputExt) {
    const outputFile = inputFile.replace('.asm', `.${outputExt}`);
    const args = [`-f${format}`, inputFile, "-o", outputFile];
    if (debugInfo !== 'none') args.splice(1, 0, `-g${debugInfo}`);
    return args;
}

function _parseOutput(output, source) {
    const diags = [];
    for (const line of output.split('\n')) {
        const match = line.match(/^.*?:(\d+):\s*(error|warning|note):\s*(.+)$/i);
        if (!match) continue;
        const lineNum  = Math.max(0, parseInt(match[1]) - 1);
        const severity = match[2].toLowerCase() === 'warning' ? 'warning' : 'error';
        diags.push({ line: lineNum, message: match[3].trim(), severity, source });
    }
    return diags;
}

module.exports = { runCompiler, findCompiler };
