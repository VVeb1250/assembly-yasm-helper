"use strict";

const {
    createConnection, ProposedFeatures,
    TextDocuments, TextDocumentSyncKind,
    DiagnosticSeverity, CompletionItemKind, SymbolKind,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const { fileURLToPath } = require('url');

// Core — zero VS Code deps
const { SymbolRegistry }      = require('../out/registry');
const { DocumentScanner }     = require('../out/scanner');
const { analyzeDiagnostics }  = require('../out/core/diagnosticEngine');
const { getHoverContent }     = require('../out/core/hoverEngine');
const { getCompletionItems }  = require('../out/core/completionEngine');
const { getSemanticTokens, TOKEN_TYPES, TOKEN_MODIFIERS } = require('../out/core/semanticEngine');
const { runCompiler, findCompiler } = require('../out/core/compilerEngine');
const { findReferences }      = require('../out/core/referencesEngine');
const { KEYWORD_MAP }         = require('../out/data/keywords');
const { INSTRUCTION_SIGNATURES } = require('../out/data/instructionSignatures');

// -------------------------------------------------------
// Connection & document manager
// -------------------------------------------------------
const connection = createConnection(ProposedFeatures.all);
const documents  = new TextDocuments(TextDocument);

// Per-document state
const registries = new Map(); // uri → SymbolRegistry
const scanners   = new Map(); // uri → DocumentScanner
let   serverConfig = {};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function getOrCreate(uri) {
    if (!registries.has(uri)) {
        const reg     = new SymbolRegistry();
        const scanner = new DocumentScanner(reg);
        registries.set(uri, reg);
        scanners.set(uri, scanner);
    }
    return { registry: registries.get(uri), scanner: scanners.get(uri) };
}

function uriToPath(uri) {
    try { return fileURLToPath(uri); } catch (_) { return uri; }
}

function getWordAtPosition(lines, line, character) {
    const lineText = lines[line] || '';
    const IDENT_RE = /[A-Za-z_.$?][\w.$?]*/g;
    let m;
    while ((m = IDENT_RE.exec(lineText)) !== null) {
        if (m.index <= character && character <= m.index + m[0].length)
            return { word: m[0], start: m.index, end: m.index + m[0].length };
    }
    return null;
}

function cfg(key, def) {
    return serverConfig[key] !== undefined ? serverConfig[key] : def;
}

function toSeverity(s) {
    return s === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error;
}

function makeRange(line, startCol, endCol) {
    return { start: { line, character: startCol }, end: { line, character: endCol } };
}

// Build semantic tokens data array (delta encoding)
function buildSemanticTokensData(tokens) {
    const data = [];
    let prevLine = 0, prevCol = 0;
    tokens.sort((a, b) => a.line !== b.line ? a.line - b.line : a.col - b.col);
    for (const t of tokens) {
        const deltaLine = t.line - prevLine;
        const deltaCol  = deltaLine === 0 ? t.col - prevCol : t.col;
        data.push(deltaLine, deltaCol, t.length, t.tokenTypeIndex, 0);
        prevLine = t.line;
        prevCol  = t.col;
    }
    return data;
}

// Signature help helpers
const _ts = b => ((b&3)===3)?'r/m':(b&1)?'reg':(b&2)?'mem':(b&4)?'imm':(b&8)?'label':'?';
const _isReg = w => /^(r(ax|bx|cx|dx|si|di|bp|sp)|e(ax|bx|cx|dx|si|di|bp|sp)|[abcd][xhl]|[sd]il|[bs]pl|r\d{1,2}[bdw]?|[xyz]mm\d+|k[0-7]|[cdefgs]s|[re]ip|rflags|eflags)$/i.test(w);
function _classifyOp(op) {
    if (op.includes('[')) return 2;
    const tokens = op.split(/\s+/).filter(t => t.length > 0);
    if (tokens.some(t => _isReg(t))) return 1;
    if (tokens.length === 1 && /^(0x[0-9a-f]+|[0-9][0-9a-f]*[hbd]?)$/i.test(tokens[0])) return 4;
    return 8 | 4;
}

// CompletionItemKind map: KeywordType value → LSP kind
const KIND_MAP = {
    2:  CompletionItemKind.Keyword,      // instruction
    5:  CompletionItemKind.Keyword,      // memoryAllocation
    4:  CompletionItemKind.Interface,    // precompiled
    3:  CompletionItemKind.Constant,     // register
    6:  CompletionItemKind.Property,     // savedWord
    7:  CompletionItemKind.Constructor,  // size
    8:  CompletionItemKind.Variable,     // variable
    9:  CompletionItemKind.Method,       // method
    10: CompletionItemKind.Struct,       // structure
    12: CompletionItemKind.Unit,         // label
    11: CompletionItemKind.Function,     // macro
    1:  CompletionItemKind.File,         // file
    13: CompletionItemKind.Value,        // constant
    14: CompletionItemKind.Operator,     // operator
};

// -------------------------------------------------------
// Initialize
// -------------------------------------------------------
connection.onInitialize(() => {
    return {
        capabilities: {
            textDocumentSync:       TextDocumentSyncKind.Incremental,
            completionProvider:     { triggerCharacters: [' ', '.', '[', ',', '+', '*', '('] },
            hoverProvider:          true,
            definitionProvider:     true,
            documentSymbolProvider: true,
            signatureHelpProvider:  { triggerCharacters: [' ', ','] },
            referencesProvider:     true,
            semanticTokensProvider: {
                legend:  { tokenTypes: TOKEN_TYPES, tokenModifiers: TOKEN_MODIFIERS },
                full:    true,
            },
        },
    };
});

connection.onInitialized(async () => {
    await _loadConfig();
    connection.onDidChangeConfiguration(async () => { await _loadConfig(); });
});

async function _loadConfig() {
    try {
        const r = await connection.workspace.getConfiguration({ section: 'assembly' });
        serverConfig = r || {};
    } catch (_) {
        serverConfig = {};
    }
}

// -------------------------------------------------------
// Scan helpers
// -------------------------------------------------------
async function scanDocument(doc) {
    const { registry, scanner } = getOrCreate(doc.uri);
    const lines = doc.getText().split(/\r?\n/);
    scanner.currentFilePath = uriToPath(doc.uri);
    await scanner.scan(lines);
    return { registry, lines };
}

async function _analyze(doc, onSave = false) {
    const { registry, lines } = await scanDocument(doc);

    const plain      = analyzeDiagnostics(lines, registry);
    const staticDiags = plain.map(d => ({
        range:    makeRange(d.line, d.startCol, d.endCol),
        message:  d.message,
        severity: toSeverity(d.severity),
        source:   'assembly',
    }));

    let allDiags = [...staticDiags];

    if (onSave && cfg('enableCompilerCheck', false)) {
        const compilerType = cfg('compilerType', 'yasm');
        let compilerPath   = cfg('compilerPath', '');
        if (!compilerPath) compilerPath = await findCompiler(compilerType);

        if (compilerPath) {
            const compilerDiags = await runCompiler({
                compilerPath,
                compilerType,
                compilerFormat: cfg('compilerFormat', 'elf64'),
                debugInfo:      cfg('compilerDebugInfo', 'dwarf2'),
                outputExt:      cfg('outputExtension', 'o'),
                documentText:   doc.getText(),
            });
            allDiags = allDiags.concat(compilerDiags.map(d => ({
                range:    makeRange(d.line, 0, Number.MAX_SAFE_INTEGER),
                message:  d.message,
                severity: toSeverity(d.severity),
                source:   d.source,
            })));
        }
    }

    connection.sendDiagnostics({ uri: doc.uri, diagnostics: allDiags });
}

documents.onDidOpen(e    => _analyze(e.document));
documents.onDidChangeContent(e => _analyze(e.document));
documents.onDidSave(e    => _analyze(e.document, true));

documents.onDidClose(e => {
    registries.delete(e.document.uri);
    scanners.delete(e.document.uri);
    connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// -------------------------------------------------------
// Completion
// -------------------------------------------------------
connection.onCompletion(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const { registry } = getOrCreate(doc.uri);
    const lines    = doc.getText().split(/\r?\n/);
    const lineText = (lines[params.position.line] || '').slice(0, params.position.character);

    const plain = getCompletionItems({ line: lineText, lineIdx: params.position.line, lines }, registry);
    return plain.map(p => ({
        label:         p.label,
        kind:          KIND_MAP[p.kindType] ?? CompletionItemKind.Text,
        detail:        p.detail,
        documentation: p.doc,
        sortText:      p.sortText,
        insertText:    p.insertText || p.label,
    }));
});

// -------------------------------------------------------
// Hover
// -------------------------------------------------------
connection.onHover(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const { registry } = getOrCreate(doc.uri);
    const lines = doc.getText().split(/\r?\n/);
    const hit   = getWordAtPosition(lines, params.position.line, params.position.character);
    if (!hit) return null;

    const output = getHoverContent(hit.word, registry);
    if (!output) return null;

    const contents = output.map(o =>
        o.language === 'plainText' ? o.value : { language: o.language, value: o.value }
    );
    return { contents };
});

// -------------------------------------------------------
// Definition
// -------------------------------------------------------
connection.onDefinition(params => {
    if (!cfg('enableGoToDefinition', true)) return null;
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const { registry } = getOrCreate(doc.uri);
    const lines = doc.getText().split(/\r?\n/);
    const hit   = getWordAtPosition(lines, params.position.line, params.position.character);
    if (!hit) return null;

    const sym = registry.findLabel(hit.word) || registry.findVariable(hit.word) ||
                registry.findProcedure(hit.word) || registry.findMacro(hit.word);
    if (!sym || sym.line === undefined) return null;

    return { uri: doc.uri, range: makeRange(sym.line, 0, 0) };
});

// -------------------------------------------------------
// Document Symbols
// -------------------------------------------------------
connection.onDocumentSymbol(params => {
    if (!cfg('enableDocumentSymbols', true)) return [];
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const { registry } = getOrCreate(doc.uri);
    const symbols = [];

    for (const proc of registry.procs) {
        if (proc.line === undefined) continue;
        const pos = { line: proc.line, character: 0 };
        symbols.push({ name: proc.name, detail: '(Procedure)', kind: SymbolKind.Function, range: { start: pos, end: pos }, selectionRange: { start: pos, end: pos } });
    }
    for (const v of registry.vars) {
        if (v.line === undefined) continue;
        const pos = { line: v.line, character: 0 };
        symbols.push({ name: v.name, detail: v.type + (v.section ? ' [' + v.section + ']' : ''), kind: SymbolKind.Variable, range: { start: pos, end: pos }, selectionRange: { start: pos, end: pos } });
    }
    for (const macro of registry.macros) {
        if (macro.line === undefined) continue;
        const pos = { line: macro.line, character: 0 };
        symbols.push({ name: macro.name, detail: '(Macro)', kind: SymbolKind.Module, range: { start: pos, end: pos }, selectionRange: { start: pos, end: pos } });
    }
    for (const label of registry.labels) {
        if (label.line === undefined) continue;
        const pos = { line: label.line, character: 0 };
        symbols.push({ name: label.name, detail: '(Label)', kind: SymbolKind.Key, range: { start: pos, end: pos }, selectionRange: { start: pos, end: pos } });
    }
    return symbols;
});

// -------------------------------------------------------
// Signature Help
// -------------------------------------------------------
connection.onSignatureHelp(params => {
    if (!cfg('enableSignatureHelp', true)) return null;
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;
    const { registry } = getOrCreate(doc.uri);
    const lines    = doc.getText().split(/\r?\n/);
    const lineText = (lines[params.position.line] || '').slice(0, params.position.character);

    const commentIdx = lineText.indexOf(';');
    if (commentIdx !== -1 && commentIdx < params.position.character) return null;

    const trimmed = lineText.trimStart();
    const words   = trimmed.split(/\s+/);
    if (words.length < 2) return null;

    const opcode      = words[0].toLowerCase();
    const kw          = KEYWORD_MAP.get(opcode);
    const sigs        = INSTRUCTION_SIGNATURES[opcode];
    const macro       = registry?.findMacro(opcode);
    const afterOpcode = lineText.slice(lineText.toLowerCase().indexOf(opcode) + opcode.length);
    const commaCount  = (afterOpcode.match(/,/g) || []).length;
    const result      = { signatures: [], activeSignature: 0, activeParameter: 0 };

    if (sigs?.length) {
        result.signatures = sigs.map(form => {
            const label = form.length ? `${opcode} ${form.map(_ts).join(', ')}` : opcode;
            const sig   = { label, documentation: kw?.def || '', parameters: [] };
            let searchFrom = opcode.length + (form.length ? 1 : 0);
            for (const bits of form) {
                const name  = _ts(bits);
                const start = label.indexOf(name, searchFrom);
                sig.parameters.push({ label: [start, start + name.length] });
                searchFrom = start + name.length + 1;
            }
            return sig;
        });
        const typedParts = afterOpcode.split(',');
        let activeIdx = 0;
        if (commaCount > 0) {
            const completedOps = typedParts.slice(0, commaCount).map(o => o.trim());
            for (let i = 0; i < sigs.length; i++) {
                if (sigs[i].length < typedParts.length) continue;
                if (completedOps.every((op, j) => !op || (_classifyOp(op) & sigs[i][j]))) { activeIdx = i; break; }
            }
        }
        result.activeSignature = activeIdx;
        result.activeParameter = Math.min(commaCount, sigs[activeIdx].length - 1);

    } else if (kw?.data) {
        const paramStr = kw.data.slice(opcode.length).trim();
        const sig = { label: kw.data, documentation: kw.def || '', parameters: [] };
        if (paramStr) {
            let searchFrom = kw.data.length - paramStr.length;
            for (const p of paramStr.split(',')) {
                const name  = p.trim();
                const start = kw.data.indexOf(name, searchFrom);
                sig.parameters.push({ label: [start, start + name.length] });
                searchFrom = start + name.length + 1;
            }
        }
        result.signatures      = [sig];
        result.activeParameter = Math.min(commaCount, sig.parameters.length - 1);

    } else if (macro?.argCount > 0) {
        const paramNames = Array.from({ length: macro.argCount }, (_, i) => `%${i + 1}`);
        const label = `${macro.name} ${paramNames.join(', ')}`;
        const sig   = { label, documentation: `(Macro) ${macro.name} — ${macro.argCount} arg${macro.argCount !== 1 ? 's' : ''}`, parameters: [] };
        let searchFrom = macro.name.length + 1;
        for (const p of paramNames) {
            const start = label.indexOf(p, searchFrom);
            sig.parameters.push({ label: [start, start + p.length] });
            searchFrom = start + p.length + 1;
        }
        result.signatures      = [sig];
        result.activeParameter = Math.min(commaCount, paramNames.length - 1);

    } else {
        return null;
    }

    return result;
});

// -------------------------------------------------------
// References
// -------------------------------------------------------
connection.onReferences(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];
    const { registry } = getOrCreate(doc.uri);
    const lines = doc.getText().split(/\r?\n/);
    const hit   = getWordAtPosition(lines, params.position.line, params.position.character);
    if (!hit) return [];

    return findReferences(hit.word, lines, registry, params.context.includeDeclaration)
        .map(r => ({ uri: doc.uri, range: makeRange(r.line, r.startCol, r.endCol) }));
});

// -------------------------------------------------------
// Semantic Tokens
// -------------------------------------------------------
connection.languages.semanticTokens.on(params => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return { data: [] };
    const { registry } = getOrCreate(doc.uri);
    const lines  = doc.getText().split(/\r?\n/);
    const tokens = getSemanticTokens(lines, registry);
    return { data: buildSemanticTokensData(tokens) };
});

// -------------------------------------------------------
// Start
// -------------------------------------------------------
documents.listen(connection);
connection.listen();
