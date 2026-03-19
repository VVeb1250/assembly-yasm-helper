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