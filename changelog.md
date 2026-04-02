## 2.4.0
- feat **asmconfig.json** — explicit multi-file project config: define `sources`, `output`, `linkerFlags`, `format`, `entryPoint`; extension auto-discovers closest config when building
- feat **"Assembly: Create asmconfig.json"** command — generates config from current file + detected extern dependencies
- feat **multi-project quick pick** — when multiple `asmconfig.json` exist in workspace, shows quick pick to select which project to build

## 2.3.3
- fix **size mismatch false positive** — `mov al, [rbx]` and similar mixed reg+mem instructions no longer incorrectly reported as size mismatch (address registers inside `[...]` are now ignored when checking data sizes)

## 2.3.2
- fix **extern hover/F12** — race conditions on startup eliminated; hover now consistently shows cross-file doc; F12 no longer requires the target file to have been previously opened
- fix **doc comment order** — JSDoc above plain-label functions was displayed in reverse

## 2.3.1
- fix **number hover** — `0x1F`, `1Fh`, `1010b` now correctly show decimal/hex/binary conversions on hover (VS Code default word boundary was splitting the tokens)

## 2.3.0
- fix **cross-file Go to Definition** (F12) — now reliably jumps to the defining file by tracking extern symbols in a dedicated `registry.externs` set instead of fragile line-number checks
- feat **extern hover doc** — hovering an extern symbol with a single source file now shows its JSDoc description, `@arg`, and `@out` comments from the declaring file

## 2.2.1
- fix **extern multi-symbol**: `extern a, b, c` now correctly registers all symbols
- fix **extern hover**: hovering on an extern-declared symbol now shows source file and line (e.g. `(extern) stats — extern-function.s [line 15]`) instead of a misleading local line number

## 2.2.0
- add **hover doc for plain-label functions** — JSDoc comments (`; @arg:`, `; @out:`, description) above any `label:` now appear in hover tooltips, same as `proc`/`endp` style
- add **scoped Go to Definition for local labels** — F12 on `.done`/`.loop`/`.write` etc. now resolves to the correct parent scope instead of always jumping to the first occurrence in the file
- add **code folding for plain-label functions** — any non-local label on its own line (`printStr:`, `_start:`, etc.) creates a fold region that closes just before the next label/proc/section

## 2.1.2
- fix extension entry point — `main` now correctly points to bundled `dist/extension.js` instead of unbundled source; all previous versions were loading unminified source files

## 2.1.1
- add **Debug with DDD** command — assembles with debug symbols, resolves `extern` dependencies, then launches `ddd --debugger gdb <exe>`; new settings: `assembly.dddPath`, `assembly.dddDebugger`
- fix false "Duplicate label" error for NASM local labels (`.done`, `.loop`, `.write`, etc.) — local labels are scoped to their parent label and must not be checked globally

## 2.1.0
- add **workspace symbol index** — scans all `.asm`/`.s` files in workspace, caches `global` symbols per file with `FileSystemWatcher` for live updates
- add **cross-file extern completion** — typing `extern ` suggests `global` symbols from other files, deduplicated by name with source file(s) shown in detail
- add **cross-file Go to Definition** (F12) — jumps to the label definition in the declaring file instead of the local `extern` line
- fix **global completion** — typing `global ` now suggests labels and procs from current file
- fix **directive value completion** — after `db`/`dw`/`equ`/`resb`/etc. suggests vars, labels, procs, and defines as values
- improve **Build & Run** — auto-detects dependency files from `extern` declarations and assembles + links all required files together

## 2.0.1
- add **Build & Run** command — assembles the current file, links with `ld`, and runs the result in an integrated terminal
- add `assembly.linkerPath` setting — path to linker executable (auto-detects `ld` if empty)
- add `assembly.entryPoint` setting — entry point symbol for linker (default `_start`)

## 2.0.0
- add **LSP server** — full language server for Neovim and any LSP-compatible editor
- install via `npm install -g assembly-yasm-helper`, run as `assembly-yasm-lsp --stdio`
- supports: completion, hover, go to definition, document symbols, signature help, references, diagnostics, semantic tokens, compiler check on save
- add npm `bin` entry: `assembly-yasm-lsp` command available after global install

## 1.4.0
- add **Find All References** (Shift+F12) — shows every usage of a label, variable, proc, or macro in the current file
- add **Rename Symbol** (F2) — renames all occurrences at once; guards against renaming keywords or registers
- add **Semantic Code Folding** — fold `proc`/`endp`, `%macro`/`%endmacro`, `struc`/`ends`, and `section` blocks with the standard VS Code fold gutter

## 1.3.4
- fix auto-indent: `section`, `global`, `extern` now de-indent automatically when typed on an indented line
- add `assembly.tabSize` setting — choose indent width 2/4/8 (default 8, classic assembly style); applied instantly without reload

## 1.3.3
- add semantic token highlighting for user-defined macro calls (instruction position)
- add semantic token highlighting for registers — distinct color in any VS Code theme
- fix syntax grammar scopes: %%labels, %1..%N params, %macro name, %define constants
- enable semanticHighlighting in all Assembly themes
- add semanticTokenColors in Assembly themes and semanticTokenScopes for built-in theme compatibility

## 1.3.2
- add macro hover shows argument count (e.g. "aver — 3 args [line 5]")
- add signature help for user-defined macros showing %1, %2, %3 with active parameter highlight
- add %1..%N completion suggestions when typing % inside a macro body

## 1.3.1
- add macro autocomplete in instruction position (user-defined macros appear alongside instructions)
- add operand suggestions (vars/registers/labels/imm) when typing macro arguments
- fix macro completion icon: was Color, now Function
- add editor defaults for assembly files: tabSize=8, insertSpaces=false

## 1.3.0
- add hover shows all valid operand forms per instruction (e.g. mov reg, reg / mov mem, reg)
- add diagnostic warning for invalid operand combinations (catches mem-to-mem mov [a],[b])
- add signature help shows all overload forms per instruction with active form tracking
- fix completion sort order: size keywords → variables → GP registers → extended → SIMD → constants
- fix signature help active parameter highlight (index pairs + correct dst/src labels)
- fix imul operand count — valid with 1, 2, or 3 operands
- update snippets to YASM/NASM syntax (%macro/%endmacro, %if/%endif, %rep/%endrep)
- add snippets: program skeleton, db/dw/dd/dq/str variable declarations, counted loop, Linux syscalls

## 1.2.2
- fix false "undefined label" warning for macro-local labels (%%label syntax)
- fix macro-local labels incorrectly flagged as duplicate labels
- fix imul false-positive operand count error — valid with 1, 2, or 3 operands

## 1.2.1
- fix false 'endp without proc' diagnostic — MASM proc format is 'name proc' not 'proc name'
- fix false 'endm without macro' diagnostic — same issue for TASM 'name macro' format
- fix macro hover showing object instead of name
- add macro support in Go to Definition (F12), Document Symbol outline, and hover line info
- fix extern detection matching words starting with 'extern' (e.g. external)

## 1.2.0
- add Go to Definition (F12) for labels, variables, and procedures
- add Document Symbol outline (Outline panel and breadcrumb navigation)
- add Signature Help — shows operand hints while typing instructions
- add settings to toggle each navigation feature individually
- fix space after completed operand showing unwanted autocomplete suggestions
- improve syntax highlighting — extended instruction and register coverage
- fix syntax scope names for registers, preprocessor directives, and sections
- add hex-suffix (1Fh) and binary (1010b) number highlighting
- refactor scanner and completion provider for readability

## 1.1.2
- fix memory leak on activation
- fix false positive "undefined" warnings for size keywords (QWORD, rel, near, far, short)
- fix macro hover showing undefined instead of macro name
- fix comment detection in hover provider
- fix extern symbols triggering false "undefined label" warnings
- add hover tooltip for variables
- add %define / %assign symbols to autocomplete suggestions
- add debounce on keystroke scan to prevent pile-up on fast typing

## 1.1.1
- fix autocomplete issue

## 1.1.0
- add advanced syntax grammar system
- improve syntax highlight structure using repository rules
- add bracket scope highlight for [], (), {}
- add auto closing bracket support
- fix language configuration path issue
- improve punctuation token detection
- improve directive highlight (.text .data .bss)
- improve register highlight coverage (xmm/ymm/zmm/debug/segment)
- add block comment support /* */
- improve string detection system
- prepare grammar structure for future memory expression parsing

## 1.0.6
- fix theme can useable
- adjust syntax hilight

## 1.0.5
- add code Diagnostic
- add compiler and Diagnostic for compiler
- can configure compiler

## 1.0.4
- fix word suggestion for smooter coding
- add 0x numberic declaretion

## 1.0.3
- Not use AutoSuggestion when TAB 
- Adjust KEYWORD_DICTIONARY

## [1.0.2] - Custom YASM Smart Release
### Added
- Added support for `.s` and `.S` file extensions.
- Added intelligent trigger mechanism for Space (` `), Tab (`\t`), and Bracket (`[`).
- Added `mul`, `imul`, `div`, and `idiv` to the smart autocomplete instruction list.
- Added strict Bracket `[]` logic: Autocomplete now exclusively suggests Variables when typing inside brackets.
- Added Root-Level detection: `section` and `global` are now only suggested at the beginning of a line.

### Changed
- Shifted focus from TASM to YASM/NASM compiler conventions.
- Improved `.data` section logic: Autocomplete no longer interrupts variable naming. Suggestions (`db`, `dw`, `resb`, etc.) now appear smoothly after hitting Space or Tab.
- Improved `mov`, `add`, `sub` autocomplete to show specific sizes (`byte`, `word`, `dword`, `qword`) alongside variables and registers.
- Re-engineered the suggestion formatting to prevent auto-inserting unwanted brackets `[]` when selecting a variable.

### Fixed
- Fixed Syntax Highlighting mismatch where single-character variables and multi-character variables had different colors. All variables now share a consistent color.
- Fixed the annoying popup issue that occurred immediately after typing a comma (`,`).
- Cleaned up obsolete metadata from `package.json` to allow successful `.vsix` packaging.

## 1.0.1
- Removed case sensetvity
- Automatic case prefrence system
- Improved syntax highlighting

## 1.0.0
- IntelliSense autocomplete for TASM assembler
- Provides info about instructions