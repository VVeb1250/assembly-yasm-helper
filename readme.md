# Assembly YASM Helper

Advanced language support for **YASM / NASM Assembly** in Visual Studio Code.

---

# 🚀 Features

## Intelligent Autocomplete

Context-aware suggestions based on cursor position:

- **Data sections** — suggests `db`, `dw`, `dd`, `dq`, `resb`, `resw`, `resd`, `resq` after the variable name
- **Text sections** — suggests instructions, registers, variables, and pointer sizes (`byte`, `word`, `dword`, `qword`…)
- **Memory brackets `[...]`** — suggests registers, variables, and `+` / `*` operators in the correct order
- **Root level** — suggests `section .text/data/bss`, `global`, `extern` only at line start
- **Preprocessor** — typing `%` suggests all YASM directives (`%include`, `%macro`, `%define`, `%if`, `%rep`…)

## 🧭 Navigation

- **Go to Definition (F12)** — jump to any label, variable, or procedure declaration
- **Find All References (Shift+F12)** — find every usage of a label, variable, or procedure
- **Rename Symbol (F2)** — rename a label, variable, or procedure across the entire file
- **Document Symbol Outline** — labels, variables, and procedures listed in the Outline panel and breadcrumb
- **Signature Help** — shows operand hints while typing (e.g. `mov <dst>, <src>`), active parameter highlighted
- **Code Folding** — fold procedures (`proc/endp`), macros (`%macro/%endmacro`), and `%if` blocks

## 🎨 Syntax Highlighting

Instructions, registers (GP / SSE / AVX / AVX-512), labels, variables, directives, numbers, operators, and preprocessor directives are all distinctly colored. Numbers support `0x1F`, `1Fh`, and `1010b` formats.

Three built-in themes: **Assembly Dark**, **Assembly Light**, **Assembly High Contrast**.

## 🔍 Hover Information

Hover over instructions, registers, variables, or numbers for details. Numbers show automatic decimal / hex / binary conversions.

## 🔴 Code Diagnostics

Real-time static analysis detects:
- Duplicate labels and jumps to undefined labels
- Unclosed blocks (`proc/endp`, `%macro/%endmacro`, `%if/%endif`)
- Operand errors — missing operands, invalid types, size mismatches

## ⚙ Compiler Integration (Optional)

Compile on save using YASM or NASM. Errors appear inline in VS Code and in the status bar (`✓ ok` / `✗ N error(s)` / `⚠ compiler not found`).

---

# ⚙ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| assembly.enableCompilerCheck | true | Enable compiler check on save |
| assembly.compilerPath | auto | Path to compiler executable |
| assembly.compilerType | yasm | `yasm` or `nasm` |
| assembly.compilerFormat | elf64 | Output format |
| assembly.compilerDebugInfo | dwarf2 | Debug info format |
| assembly.outputExtension | o | Output file extension |
| assembly.enableGoToDefinition | true | Enable Go to Definition (F12) |
| assembly.enableDocumentSymbols | true | Enable Outline panel symbols |
| assembly.enableSignatureHelp | true | Enable operand hints while typing |
| assembly.tabTriggerCompletions | false | Show completions when Tab is pressed |
| assembly.tabSize | 8 | Indentation width (2, 4, or 8) |

---

# 📂 Supported File Types

`.asm` `.s` `.S`

---

# 📋 Requirements

- Visual Studio Code **v1.48.0 or newer**
- YASM or NASM installed *(optional for compiler integration)*

---

# 🖥 Neovim Setup

This extension also ships an LSP server that works with Neovim (and any editor supporting LSP).

### 1. Install the LSP server

```sh
npm install -g assembly-yasm-helper
```

### 2. Add to your Neovim config

For **LazyVim** / **NvChad** (nvim-lspconfig v2.x):

```lua
-- ~/.config/nvim/lua/plugins/asm-lsp.lua
return {
  {
    "neovim/nvim-lspconfig",
    opts = function(_, opts)
      vim.lsp.config('assembly_yasm', {
        cmd = { 'assembly-yasm-lsp', '--stdio' },
        filetypes = { 'asm' },
        root_markers = { '.git' },
      })
      vim.lsp.enable('assembly_yasm')
    end,
  },
}
```

### 3. Filetype detection (if `.asm` files aren't recognized)

```lua
vim.filetype.add({ extension = { asm = 'asm', s = 'asm', S = 'asm' } })
```

### Supported features in Neovim

| Feature | Status |
|---------|--------|
| Completion | ✓ |
| Hover | ✓ |
| Go to Definition | ✓ |
| Document Symbols | ✓ |
| Signature Help | ✓ |
| References | ✓ |
| Diagnostics | ✓ |
| Semantic Tokens | ✓ |
| Compiler Check (on save) | ✓ |

---

# 👨‍💻 Publisher

Developed by **Roncho**
Extended and maintained by **VVeb1250**
