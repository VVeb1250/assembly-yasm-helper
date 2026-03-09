# Assembly YASM Helper

Welcome to **Assembly YASM Helper**! This extension provides advanced language support, syntax highlighting, and highly intelligent autocomplete for **YASM / NASM** assembly development in Visual Studio Code.

---

## 🚀 Key Features

### ✏️ Intelligent Autocomplete (Context-Aware)
- **`.data` & `.bss` Sections:** Smart suggestions for memory allocation (`db`, `dw`, `resb`, etc.) that only trigger *after* you finish typing your variable name
- **`.text` Section:** Context-aware suggestions for instructions like `mov`, `add`, `mul`, `div`, etc. Automatically suggests Registers, defined Variables, and Pointer Sizes (`byte`, `word`, `dword`, `qword`, `oword`, `yword`, `zword`)
- **Bracket Intelligence `[]`:** When typing inside memory brackets, the extension filters suggestions to only show relevant Variables and Registers
- **Root-Level Suggestions:** Suggests structural keywords like `section .data`, `global`, and `extern` only at the beginning of a line
- **YASM Preprocessor:** Full support for `%include`, `%macro`, `%define`, `%ifdef`, `%if`, `%rep` and more — triggered automatically when typing `%`

### 🖥️ Register Support
- Full general-purpose registers: 8-bit, 16-bit, 32-bit, 64-bit
- SSE registers: `xmm0`–`xmm15`
- AVX registers: `ymm0`–`ymm15`
- AVX-512 registers: `zmm0`–`zmm31`, mask registers `k0`–`k7`

### 🔍 Hover Information
- Hover over any instruction, register, or variable to see its description and syntax
- Hover over numbers to see conversion between Decimal, Hexadecimal, and Binary
- Supports both suffix style (`1Fh`) and prefix style (`0x1F`)

### 🔴 Code Diagnostics
- **Duplicate labels** detection
- **Unclosed blocks** — `proc/endp`, `%macro/%endmacro`, `%if/%endif`, `macro/endm`
- **Undefined references** — jump/call to labels that don't exist, variables used but not declared
- **Operand count** — detects missing or extra operands (e.g., `mov rax`)
- **Operand type** — detects wrong operand types (e.g., `jmp 42`)
- **Size mismatch** — detects register or memory size conflicts (e.g., `mov eax, rbx`, `mov dword[var], ax`)

### ⚙️ Compiler Integration (Optional)
Run YASM or NASM directly from VS Code on save and see compiler errors inline:
- Auto-detects compiler from system `PATH`
- Configurable compiler path, format (`elf64`, `win64`, etc.), and debug info (`dwarf2`, etc.)
- Status bar shows compile result: `✓ ok`, `✗ N error(s)`, or `⚠ compiler not found`

### 🎨 Broad File Support
Supports `.asm`, `.s`, and `.S` file extensions

---

## ⚙️ Compiler Setup (Optional)

To enable compiler-based error checking, configure in VS Code Settings:

| Setting | Default | Description |
|---|---|---|
| `assembly.enableCompilerCheck` | `true` | Enable compiler check on save |
| `assembly.compilerPath` | *(auto)* | Path to compiler executable |
| `assembly.compilerType` | `yasm` | `yasm` or `nasm` |
| `assembly.compilerFormat` | `elf64` | Output format |
| `assembly.compilerDebugInfo` | `dwarf2` | Debug info format |
| `assembly.outputExtension` | `o` | Output file extension |

If `compilerPath` is left empty, the extension will try to find the compiler automatically using `which`/`where`.

---

## 📦 How to Install (Manual VSIX)

1. Download the `.vsix` file
2. Open Visual Studio Code
3. Go to **Extensions** (`Ctrl+Shift+X`)
4. Click `···` → **Install from VSIX...**
5. Select the downloaded file and install
6. Restart VS Code

---

## 📋 Requirements
- Visual Studio Code **v1.48.0** or higher
- YASM or NASM installed (optional, for compiler integration)

---

## 👨‍💻 Publisher
Developed by **Roncho**, extended and maintained by **VVeb1250**