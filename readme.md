# Assembly YASM Helper

Advanced language support for **YASM / NASM Assembly** in Visual Studio Code.

Assembly YASM Helper provides **smart autocomplete, syntax highlighting, diagnostics, and optional compiler integration** to improve productivity when writing assembly code.

---

# 🚀 Features

## Intelligent Autocomplete

Context-aware suggestions depending on where you type.

### Data Sections

Inside `.data` and `.bss` sections the extension suggests memory allocation directives:

```
db   dw   dd   dq
resb resw resd resq
```

Suggestions appear **only after finishing the variable name**, preventing interruptions while typing.

Example:

```asm
msg db "Hello World"
buffer resb 64
```

---

### Instruction Awareness

Inside `.text` sections the extension suggests:

- Instructions
- Registers
- Defined variables
- Pointer sizes

Supported pointer sizes:

```
byte word dword qword oword yword zword
```

Example:

```asm
mov eax, dword [buffer]
```

---

### Bracket Intelligence

Inside memory brackets:

```
[ ... ]
```

Suggestions are filtered to show only relevant symbols:

- Registers
- Variables

Example:

```asm
mov eax, [rbx + buffer]
```

---

### Root-Level Suggestions

Structural keywords are suggested only at the start of a line:

```
section .text
section .data
section .bss
global
extern
```

---

### YASM Preprocessor Support

Typing `%` triggers suggestions for YASM preprocessor directives.

Supported directives include:

```
%include
%macro
%define
%ifdef
%ifndef
%if
%elif
%else
%endif
%rep
%endrep
```

---

# 🎨 Syntax Highlighting

Custom syntax highlighting for Assembly code:

- Instructions
- Registers
- Labels
- Variables
- Numbers
- Directives
- Operators
- Brackets `[] () {}`

Example:

```asm
section .text
global _start

_start:
    mov rax, 1
    mov rdi, 1
    mov rsi, msg
    mov rdx, 13
    syscall
```

Memory expressions are also highlighted correctly:

```asm
mov eax, [rbx + var*4]
```

---

# 🖥 Register Support

Full register coverage including modern SIMD extensions.

### General Purpose Registers
- 8-bit
- 16-bit
- 32-bit
- 64-bit

### SSE Registers
```
xmm0 – xmm15
```

### AVX Registers
```
ymm0 – ymm15
```

### AVX-512 Registers
```
zmm0 – zmm31
k0 – k7
```

---

# 🔍 Hover Information

Hover over instructions, registers, variables, or numbers to see additional information.

Numbers display automatic conversions:

- Decimal
- Hexadecimal
- Binary

Supported formats:

```
0x1F
1Fh
```

---

# 🔴 Code Diagnostics

Real-time analysis detects common assembly mistakes.

### Label Problems
- Duplicate labels
- Jump to undefined labels

### Unclosed Blocks

Detects missing block endings:

```
proc / endp
%macro / %endmacro
%if / %endif
macro / endm
```

### Operand Validation

Examples:

```asm
mov rax        ; missing operand
jmp 42         ; invalid operand
mov eax, rbx   ; size mismatch
mov dword[var], ax
```

---

# ⚙ Compiler Integration (Optional)

Compile automatically on save using **YASM or NASM**.

Compiler errors appear directly inside VS Code.

Features:

- Automatic compiler detection from system PATH
- Inline compiler diagnostics
- Status bar compile results

Status indicators:

```
✓ ok
✗ N error(s)
⚠ compiler not found
```

---

# ⚙ Configuration

Configure in **VS Code Settings**.

| Setting | Default | Description |
|-------|-------|-------------|
| assembly.enableCompilerCheck | true | Enable compiler check on save |
| assembly.compilerPath | auto | Path to compiler executable |
| assembly.compilerType | yasm | yasm or nasm |
| assembly.compilerFormat | elf64 | Output format |
| assembly.compilerDebugInfo | dwarf2 | Debug information format |
| assembly.outputExtension | o | Output file extension |

---

# 📂 Supported File Types

The extension activates automatically for:

```
.asm
.s
.S
```

---

# 📦 Manual Installation

Install manually using a `.vsix` file.

1. Download the `.vsix`
2. Open VS Code
3. Go to **Extensions** (`Ctrl+Shift+X`)
4. Click **...**
5. Select **Install from VSIX**
6. Choose the downloaded file
7. Restart VS Code

---

# 📋 Requirements

- Visual Studio Code **v1.48.0 or newer**
- YASM or NASM installed *(optional for compiler integration)*

---

# 👨‍💻 Publisher

Developed by **Roncho**  
Extended and maintained by **VVeb1250**