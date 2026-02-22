"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYWORD_DICONTARY = exports.REGISTERS = void 0;
const enums_1 = require("./enums");
const structs_1 = require("./structs");
exports.REGISTERS = [
    // 8-bit registers
    "ah", "bh", "ch", "dh", "al", "bl", "cl", "dl",
    "sil", "dil", "bpl", "spl", "r8b", "r9b", "r10b", "r11b", "r12b", "r13b", "r14b", "r15b",
    // 16-bit registers
    "ax", "bx", "cx", "dx", "di", "si", "bp", "sp", 
    "r8w", "r9w", "r10w", "r11w", "r12w", "r13w", "r14w", "r15w",
    // 32-bit registers
    "eax", "ebx", "ecx", "edx", "edi", "esi", "ebp", "esp",
    "r8d", "r9d", "r10d", "r11d", "r12d", "r13d", "r14d", "r15d",
    // 64-bit registers
    "rax", "rbx", "rcx", "rdx", "rdi", "rsi", "rbp", "rsp",
    "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15",
    // Segment registers
    "cs", "ds", "es", "fs", "gs", "ss",
    // Instruction Pointer & Flags
    "eip", "rip", "eflags", "rflags",
    // Control & Debug Registers
    "cr0", "cr2", "cr3", "cr4", "cr8",
    "dr0", "dr1", "dr2", "dr3", "dr6", "dr7"
];
exports.KEYWORD_DICONTARY = [
    // ==========================================
    // Scope & Section Modifiers (YASM/NASM/TASM)
    // ==========================================
    new structs_1.KeywordDef("section", "Defines a section (e.g., section .data)", enums_1.KeywordType.savedWord, "section", 0),
    new structs_1.KeywordDef("segment", "Defines a segment (Alternative to section)", enums_1.KeywordType.savedWord, "segment", 0),
    new structs_1.KeywordDef("global", "Declares a global/public symbol", enums_1.KeywordType.savedWord, "global", 0),
    new structs_1.KeywordDef("extern", "Declares an external symbol from another module", enums_1.KeywordType.savedWord, "extern", 0),
    new structs_1.KeywordDef("common", "Declares common uninitialized data", enums_1.KeywordType.savedWord, "common", 0),
    new structs_1.KeywordDef("default rel", "Use RIP-relative addressing by default (x64)", enums_1.KeywordType.savedWord, "default rel", 0),
    new structs_1.KeywordDef("bits", "Specify target processor mode (16, 32, or 64)", enums_1.KeywordType.savedWord, "bits ", 0),
    new structs_1.KeywordDef("align", "Aligns the next instruction/data to a boundary", enums_1.KeywordType.savedWord, "align ", 0),

    // ==========================================
    // Memory Models (TASM / MASM)
    // ==========================================
    new structs_1.KeywordDef("tiny", "Code and data in 1 segment (Max 64KB, COM files)", enums_1.KeywordType.size, "tiny", 0),
    new structs_1.KeywordDef("small", "1 Code segment, 1 Data segment (Max 128KB)", enums_1.KeywordType.size, "small", 0),
    new structs_1.KeywordDef("medium", "Multiple Code segments, 1 Data segment", enums_1.KeywordType.size, "medium", 0),
    new structs_1.KeywordDef("compact", "1 Code segment, Multiple Data segments", enums_1.KeywordType.size, "compact", 0),
    new structs_1.KeywordDef("large", "Multiple Code and Data segments", enums_1.KeywordType.size, "large", 0),
    new structs_1.KeywordDef("huge", "Like large, but arrays can exceed 64KB", enums_1.KeywordType.size, "huge", 0),
    new structs_1.KeywordDef("flat", "32-bit or 64-bit continuous unsegmented memory", enums_1.KeywordType.size, "flat", 0),
    new structs_1.KeywordDef("stdcall", "Standard calling convention (Arguments pushed right-to-left)", enums_1.KeywordType.size, "stdcall", 0),

    // ==========================================
    // Memory Allocation (Initialized - YASM/NASM/TASM)
    // ==========================================
    new structs_1.KeywordDef("db", "Define Byte (8-bit)", enums_1.KeywordType.memoryAllocation, "db "),
    new structs_1.KeywordDef("dw", "Define Word (16-bit)", enums_1.KeywordType.memoryAllocation, "dw "),
    new structs_1.KeywordDef("dd", "Define Doubleword (32-bit)", enums_1.KeywordType.memoryAllocation, "dd "),
    new structs_1.KeywordDef("dq", "Define Quadword (64-bit)", enums_1.KeywordType.memoryAllocation, "dq "),
    new structs_1.KeywordDef("dt", "Define Tenbytes (80-bit)", enums_1.KeywordType.memoryAllocation, "dt "),

    // ==========================================
    // Memory Allocation (Uninitialized - YASM/NASM)
    // ==========================================
    new structs_1.KeywordDef("resb", "Reserve Bytes", enums_1.KeywordType.memoryAllocation, "resb "),
    new structs_1.KeywordDef("resw", "Reserve Words (16-bit)", enums_1.KeywordType.memoryAllocation, "resw "),
    new structs_1.KeywordDef("resd", "Reserve Doublewords (32-bit)", enums_1.KeywordType.memoryAllocation, "resd "),
    new structs_1.KeywordDef("resq", "Reserve Quadwords (64-bit)", enums_1.KeywordType.memoryAllocation, "resq "),
    new structs_1.KeywordDef("rest", "Reserve Tenbytes (80-bit)", enums_1.KeywordType.memoryAllocation, "rest "),

    // ==========================================
    // Memory Locating (Size Pointers)
    // ==========================================
    new structs_1.KeywordDef("byte", "Locates 1 byte of memory", enums_1.KeywordType.memoryAllocation, "byte", -1),
    new structs_1.KeywordDef("word", "Locates 2 bytes of memory", enums_1.KeywordType.memoryAllocation, "word", -1),
    new structs_1.KeywordDef("dword", "Locates 4 bytes of memory", enums_1.KeywordType.memoryAllocation, "dword", -1),
    new structs_1.KeywordDef("qword", "Locates 8 bytes of memory", enums_1.KeywordType.memoryAllocation, "qword", -1),
    new structs_1.KeywordDef("tbyte", "Locates 10 bytes of memory", enums_1.KeywordType.memoryAllocation, "tbyte", -1),

    // ==========================================
    // TASM / MASM Specific Directives
    // ==========================================
    new structs_1.KeywordDef("DATASEG", "Start of the data segment (TASM/MASM)", enums_1.KeywordType.savedWord, "DATASEG", 0),
    new structs_1.KeywordDef("IDEAL", "Switches to IDEAL mode (TASM)", enums_1.KeywordType.savedWord, "IDEAL", 0),
    new structs_1.KeywordDef("MASM", "Switches to MASM mode (TASM)", enums_1.KeywordType.savedWord, "MASM", 0),
    new structs_1.KeywordDef("CODESEG", "Start of the code segment (TASM/MASM)", enums_1.KeywordType.savedWord, "CODESEG", 0),
    new structs_1.KeywordDef("MODEL", "Defines the memory model", enums_1.KeywordType.savedWord, "MODEL [size]", 1, enums_1.AllowKinds.size),
    new structs_1.KeywordDef("STACK", "Sets the size of the stack", enums_1.KeywordType.savedWord, "STACK [constant]", 1, enums_1.AllowKinds.constants),

    // ==========================================
    // Macros & Preprocessors (YASM / NASM / TASM)
    // ==========================================
    new structs_1.KeywordDef("%macro", "Starts a multi-line macro (NASM/YASM)", enums_1.KeywordType.precompiled, "%macro "),
    new structs_1.KeywordDef("%endmacro", "Ends a macro (NASM/YASM)", enums_1.KeywordType.precompiled, "%endmacro", 0),
    new structs_1.KeywordDef("%define", "Single-line macro or constant (NASM/YASM)", enums_1.KeywordType.precompiled, "%define "),
    new structs_1.KeywordDef("%include", "Include another source file (NASM/YASM)", enums_1.KeywordType.precompiled, "%include "),
    new structs_1.KeywordDef("macro", "Creates a new macro (TASM/MASM)", enums_1.KeywordType.precompiled, "macro [name]", 1),
    new structs_1.KeywordDef("endm", "Ends a macro definition (TASM/MASM)", enums_1.KeywordType.precompiled, "endm", 0),
    new structs_1.KeywordDef("equ", "Constant Equate (Evaluated immediately)", enums_1.KeywordType.precompiled, "equ "),
    new structs_1.KeywordDef("dup", "Allocates uninitialized values count times", enums_1.KeywordType.precompiled, "dup([values])", 1),
    new structs_1.KeywordDef("include", "Includes a file in this file", enums_1.KeywordType.precompiled, "include "),

    // ==========================================
    // Basic Instructions & Data Transfer
    // ==========================================
    new structs_1.KeywordDef("mov", "Moves value from source to destination"),
    new structs_1.KeywordDef("movzx", "Move with Zero-Extend (e.g., byte to word)", enums_1.KeywordType.instruction, "movzx "),
    new structs_1.KeywordDef("movsx", "Move with Sign-Extend (e.g., byte to word)", enums_1.KeywordType.instruction, "movsx "),
    new structs_1.KeywordDef("xchg", "Exchanges the contents of two operands"),
    new structs_1.KeywordDef("xadd", "Exchanges and adds operands"),
    new structs_1.KeywordDef("cmpxchg", "Compare and exchange"),
    new structs_1.KeywordDef("lea", "Load Effective Address", enums_1.KeywordType.instruction, undefined, 2, enums_1.AllowKinds.variables | enums_1.AllowKinds.memory),
    new structs_1.KeywordDef("nop", "No Operation (Does nothing)", enums_1.KeywordType.instruction, "nop", 0),

    // ==========================================
    // Arithmetic Instructions
    // ==========================================
    new structs_1.KeywordDef("add", "Adds source operand to destination"),
    new structs_1.KeywordDef("sub", "Subtracts source operand from destination"),
    new structs_1.KeywordDef("inc", "Increments operand by 1", enums_1.KeywordType.instruction, "inc ", 1),
    new structs_1.KeywordDef("dec", "Decrements operand by 1", enums_1.KeywordType.instruction, "dec ", 1),
    new structs_1.KeywordDef("neg", "Two's complement negation", enums_1.KeywordType.instruction, "neg ", 1),
    new structs_1.KeywordDef("cmp", "Compares operands (Subtracts without saving result)"),
    new structs_1.KeywordDef("mul", "Unsigned multiplication", enums_1.KeywordType.instruction, "mul ", 1),
    new structs_1.KeywordDef("imul", "Signed multiplication", enums_1.KeywordType.instruction, "imul ", 1),
    new structs_1.KeywordDef("div", "Unsigned division", enums_1.KeywordType.instruction, "div ", 1),
    new structs_1.KeywordDef("idiv", "Signed division", enums_1.KeywordType.instruction, "idiv ", 1),
    
    // Size Conversions (Crucial for Div/Idiv)
    new structs_1.KeywordDef("cbw", "Convert Byte to Word (AL -> AX)", enums_1.KeywordType.instruction, "cbw", 0),
    new structs_1.KeywordDef("cwd", "Convert Word to Doubleword (AX -> DX:AX)", enums_1.KeywordType.instruction, "cwd", 0),
    new structs_1.KeywordDef("cdq", "Convert Doubleword to Quadword (EAX -> EDX:EAX)", enums_1.KeywordType.instruction, "cdq", 0),
    new structs_1.KeywordDef("cqo", "Convert Quadword to Octoword (RAX -> RDX:RAX) [64-bit]", enums_1.KeywordType.instruction, "cqo", 0),

    // ==========================================
    // Bitwise Logic & Shifts
    // ==========================================
    new structs_1.KeywordDef("and", "Logical AND operation"),
    new structs_1.KeywordDef("or", "Logical OR operation"),
    new structs_1.KeywordDef("xor", "Logical Exclusive OR"),
    new structs_1.KeywordDef("not", "One's complement negation (Bitwise NOT)", enums_1.KeywordType.instruction, "not ", 1),
    new structs_1.KeywordDef("test", "Logical Compare (AND without saving result)"),
    new structs_1.KeywordDef("shl", "Shift Logical Left (Multiplies by 2)"),
    new structs_1.KeywordDef("shr", "Shift Logical Right (Unsigned division by 2)"),
    new structs_1.KeywordDef("sal", "Shift Arithmetic Left (Same as SHL)"),
    new structs_1.KeywordDef("sar", "Shift Arithmetic Right (Signed division by 2)"),
    new structs_1.KeywordDef("rol", "Rotate Left"),
    new structs_1.KeywordDef("ror", "Rotate Right"),
    new structs_1.KeywordDef("rcl", "Rotate Left through Carry"),
    new structs_1.KeywordDef("rcr", "Rotate Right through Carry"),
    new structs_1.KeywordDef("shld", "Double precision shift left"),
    new structs_1.KeywordDef("shrd", "Double precision shift right"),

    // ==========================================
    // System & Interrupts
    // ==========================================
    new structs_1.KeywordDef("int", "Software Interrupt", enums_1.KeywordType.instruction, "int ", 1, enums_1.AllowKinds.constants),
    new structs_1.KeywordDef("into", "Interrupt on Overflow", enums_1.KeywordType.instruction, "into", 0),
    new structs_1.KeywordDef("iret", "Interrupt Return", enums_1.KeywordType.instruction, "iret", 0),
    new structs_1.KeywordDef("syscall", "Fast System Call (64-bit OS)", enums_1.KeywordType.instruction, "syscall", 0),
    new structs_1.KeywordDef("sysret", "Return from Fast System Call", enums_1.KeywordType.instruction, "sysret", 0),
    new structs_1.KeywordDef("hlt", "Halt processor", enums_1.KeywordType.instruction, "hlt", 0),
    new structs_1.KeywordDef("in", "Read from hardware port"),
    new structs_1.KeywordDef("out", "Write to hardware port"),

    // ==========================================
    // Stack Operations
    // ==========================================
    new structs_1.KeywordDef("push", "Push operand onto stack", enums_1.KeywordType.instruction, "push ", 1),
    new structs_1.KeywordDef("pop", "Pop value from stack into operand", enums_1.KeywordType.instruction, "pop ", 1),
    new structs_1.KeywordDef("pushf", "Push 16-bit FLAGS", enums_1.KeywordType.instruction, "pushf", 0),
    new structs_1.KeywordDef("pushfd", "Push 32-bit EFLAGS", enums_1.KeywordType.instruction, "pushfd", 0),
    new structs_1.KeywordDef("pushfq", "Push 64-bit RFLAGS", enums_1.KeywordType.instruction, "pushfq", 0),
    new structs_1.KeywordDef("popf", "Pop 16-bit FLAGS", enums_1.KeywordType.instruction, "popf", 0),
    new structs_1.KeywordDef("popfd", "Pop 32-bit EFLAGS", enums_1.KeywordType.instruction, "popfd", 0),
    new structs_1.KeywordDef("popfq", "Pop 64-bit RFLAGS", enums_1.KeywordType.instruction, "popfq", 0),
    new structs_1.KeywordDef("pusha", "Push all 16-bit general registers", enums_1.KeywordType.instruction, "pusha", 0),
    new structs_1.KeywordDef("pushad", "Push all 32-bit general registers", enums_1.KeywordType.instruction, "pushad", 0),
    new structs_1.KeywordDef("popa", "Pop all 16-bit general registers", enums_1.KeywordType.instruction, "popa", 0),
    new structs_1.KeywordDef("popad", "Pop all 32-bit general registers", enums_1.KeywordType.instruction, "popad", 0),

    // ==========================================
    // Control Flow & Jump Instructions
    // ==========================================
    new structs_1.KeywordDef("jmp", "Unconditional Jump", enums_1.KeywordType.instruction, "jmp ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("call", "Call a procedure", enums_1.KeywordType.instruction, "call ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("ret", "Return from procedure", enums_1.KeywordType.instruction, "ret", 0),
    new structs_1.KeywordDef("enter", "Make stack frame", enums_1.KeywordType.instruction, "enter ", 2),
    new structs_1.KeywordDef("leave", "High level procedure exit (Destroys stack frame)", enums_1.KeywordType.instruction, "leave", 0),
    // Unsigned Jumps
    new structs_1.KeywordDef("je", "Jump if Equal (ZF=1)", enums_1.KeywordType.instruction, "je ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jne", "Jump if Not Equal (ZF=0)", enums_1.KeywordType.instruction, "jne ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("ja", "Jump if Above / Greater (Unsigned)", enums_1.KeywordType.instruction, "ja ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jae", "Jump if Above or Equal (Unsigned)", enums_1.KeywordType.instruction, "jae ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jb", "Jump if Below / Less (Unsigned)", enums_1.KeywordType.instruction, "jb ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jbe", "Jump if Below or Equal (Unsigned)", enums_1.KeywordType.instruction, "jbe ", 1, enums_1.AllowKinds.label),
    // Signed Jumps
    new structs_1.KeywordDef("jg", "Jump if Greater (Signed)", enums_1.KeywordType.instruction, "jg ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jge", "Jump if Greater or Equal (Signed)", enums_1.KeywordType.instruction, "jge ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jl", "Jump if Less (Signed)", enums_1.KeywordType.instruction, "jl ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jle", "Jump if Less or Equal (Signed)", enums_1.KeywordType.instruction, "jle ", 1, enums_1.AllowKinds.label),
    // Flag Jumps
    new structs_1.KeywordDef("jc", "Jump if Carry flag set (CF=1)", enums_1.KeywordType.instruction, "jc ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jnc", "Jump if Carry flag not set (CF=0)", enums_1.KeywordType.instruction, "jnc ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jz", "Jump if Zero flag set (ZF=1)", enums_1.KeywordType.instruction, "jz ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jnz", "Jump if Zero flag not set (ZF=0)", enums_1.KeywordType.instruction, "jnz ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("js", "Jump if Sign flag set (SF=1 / Negative)", enums_1.KeywordType.instruction, "js ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jns", "Jump if Sign flag not set (SF=0 / Positive)", enums_1.KeywordType.instruction, "jns ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jo", "Jump if Overflow flag set (OF=1)", enums_1.KeywordType.instruction, "jo ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jno", "Jump if Overflow flag not set (OF=0)", enums_1.KeywordType.instruction, "jno ", 1, enums_1.AllowKinds.label),
    // Counter Jumps
    new structs_1.KeywordDef("jcxz", "Jump if CX is 0", enums_1.KeywordType.instruction, "jcxz ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jecxz", "Jump if ECX is 0 (32-bit)", enums_1.KeywordType.instruction, "jecxz ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("jrcxz", "Jump if RCX is 0 (64-bit)", enums_1.KeywordType.instruction, "jrcxz ", 1, enums_1.AllowKinds.label),

    // ==========================================
    // String Operations (Complete Support)
    // ==========================================
    new structs_1.KeywordDef("rep", "Repeat string operation while RCX/ECX/CX != 0", enums_1.KeywordType.instruction, "rep ", 1),
    new structs_1.KeywordDef("repz", "Repeat while Zero/Equal", enums_1.KeywordType.instruction, "repz ", 1),
    new structs_1.KeywordDef("repnz", "Repeat while Not Zero/Not Equal", enums_1.KeywordType.instruction, "repnz ", 1),
    new structs_1.KeywordDef("cld", "Clear Direction Flag (String ops increment)", enums_1.KeywordType.instruction, "cld", 0),
    new structs_1.KeywordDef("std", "Set Direction Flag (String ops decrement)", enums_1.KeywordType.instruction, "std", 0),
    // SCAS
    new structs_1.KeywordDef("scasb", "Compare ES:DI with AL (8-bit)", enums_1.KeywordType.instruction, "scasb", 0),
    new structs_1.KeywordDef("scasw", "Compare ES:DI with AX (16-bit)", enums_1.KeywordType.instruction, "scasw", 0),
    new structs_1.KeywordDef("scasd", "Compare ES:EDI with EAX (32-bit)", enums_1.KeywordType.instruction, "scasd", 0),
    new structs_1.KeywordDef("scasq", "Compare ES:RDI with RAX (64-bit)", enums_1.KeywordType.instruction, "scasq", 0),
    // CMPS
    new structs_1.KeywordDef("cmpsb", "Compare ES:DI with DS:SI (8-bit)", enums_1.KeywordType.instruction, "cmpsb", 0),
    new structs_1.KeywordDef("cmpsw", "Compare ES:DI with DS:SI (16-bit)", enums_1.KeywordType.instruction, "cmpsw", 0),
    new structs_1.KeywordDef("cmpsd", "Compare ES:EDI with DS:ESI (32-bit)", enums_1.KeywordType.instruction, "cmpsd", 0),
    new structs_1.KeywordDef("cmpsq", "Compare ES:RDI with DS:RSI (64-bit)", enums_1.KeywordType.instruction, "cmpsq", 0),
    // STOS
    new structs_1.KeywordDef("stosb", "Store AL at ES:DI (8-bit)", enums_1.KeywordType.instruction, "stosb", 0),
    new structs_1.KeywordDef("stosw", "Store AX at ES:DI (16-bit)", enums_1.KeywordType.instruction, "stosw", 0),
    new structs_1.KeywordDef("stosd", "Store EAX at ES:EDI (32-bit)", enums_1.KeywordType.instruction, "stosd", 0),
    new structs_1.KeywordDef("stosq", "Store RAX at ES:RDI (64-bit)", enums_1.KeywordType.instruction, "stosq", 0),
    // LODS
    new structs_1.KeywordDef("lodsb", "Load byte at DS:SI into AL (8-bit)", enums_1.KeywordType.instruction, "lodsb", 0),
    new structs_1.KeywordDef("lodsw", "Load word at DS:SI into AX (16-bit)", enums_1.KeywordType.instruction, "lodsw", 0),
    new structs_1.KeywordDef("lodsd", "Load dword at DS:ESI into EAX (32-bit)", enums_1.KeywordType.instruction, "lodsd", 0),
    new structs_1.KeywordDef("lodsq", "Load qword at DS:RSI into RAX (64-bit)", enums_1.KeywordType.instruction, "lodsq", 0),
    // MOVS
    new structs_1.KeywordDef("movsb", "Move byte from DS:SI to ES:DI (8-bit)", enums_1.KeywordType.instruction, "movsb", 0),
    new structs_1.KeywordDef("movsw", "Move word from DS:SI to ES:DI (16-bit)", enums_1.KeywordType.instruction, "movsw", 0),
    new structs_1.KeywordDef("movsd", "Move dword from DS:ESI to ES:EDI (32-bit)", enums_1.KeywordType.instruction, "movsd", 0),
    new structs_1.KeywordDef("movsq", "Move qword from DS:RSI to ES:RDI (64-bit)", enums_1.KeywordType.instruction, "movsq", 0),

    // ==========================================
    // Loops
    // ==========================================
    new structs_1.KeywordDef("loop", "Decrement CX/ECX/RCX and Jump if not 0", enums_1.KeywordType.instruction, "loop ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("loope", "Loop while Equal", enums_1.KeywordType.instruction, "loope ", 1, enums_1.AllowKinds.label),
    new structs_1.KeywordDef("loopne", "Loop while Not Equal", enums_1.KeywordType.instruction, "loopne ", 1, enums_1.AllowKinds.label),

    // ==========================================
    // Flag Operations
    // ==========================================
    new structs_1.KeywordDef("stc", "Set Carry Flag (CF=1)", enums_1.KeywordType.instruction, "stc", 0),
    new structs_1.KeywordDef("clc", "Clear Carry Flag (CF=0)", enums_1.KeywordType.instruction, "clc", 0),
    new structs_1.KeywordDef("cmc", "Complement Carry Flag (CF=!CF)", enums_1.KeywordType.instruction, "cmc", 0),
    new structs_1.KeywordDef("sti", "Set Interrupt Flag (Enable Interrupts)", enums_1.KeywordType.instruction, "sti", 0),
    new structs_1.KeywordDef("cli", "Clear Interrupt Flag (Disable Interrupts)", enums_1.KeywordType.instruction, "cli", 0),
    new structs_1.KeywordDef("lahf", "Load AH from Flags", enums_1.KeywordType.instruction, "lahf", 0),
    new structs_1.KeywordDef("sahf", "Store AH into Flags", enums_1.KeywordType.instruction, "sahf", 0),

    // ==========================================
    // Legacy / Decimal Arithmetic
    // ==========================================
    new structs_1.KeywordDef("daa", "Decimal Adjust AL after Addition", enums_1.KeywordType.instruction, "daa", 0),
    new structs_1.KeywordDef("das", "Decimal Adjust AL after Subtraction", enums_1.KeywordType.instruction, "das", 0),
    new structs_1.KeywordDef("aaa", "ASCII Adjust AL after Addition", enums_1.KeywordType.instruction, "aaa", 0),
    new structs_1.KeywordDef("aas", "ASCII Adjust AL after Subtraction", enums_1.KeywordType.instruction, "aas", 0),
    new structs_1.KeywordDef("aam", "ASCII Adjust AX after Multiplication", enums_1.KeywordType.instruction, "aam", 0),
    new structs_1.KeywordDef("aad", "ASCII Adjust AX before Division", enums_1.KeywordType.instruction, "aad", 0),

    // ==========================================
    // Structure & Procedure Declarations (TASM/MASM)
    // ==========================================
    new structs_1.KeywordDef("proc", "Creates a new procedure", enums_1.KeywordType.precompiled, "proc", 0),
    new structs_1.KeywordDef("endp", "Ends a procedure definition", enums_1.KeywordType.precompiled, "endp", 0),
    new structs_1.KeywordDef("struc", "Creates a new structure", enums_1.KeywordType.precompiled, "struc", 0),
    new structs_1.KeywordDef("ends", "Ends a structure or segment definition", enums_1.KeywordType.precompiled, "ends", 0),

    // ==========================================
    // FPU (Floating Point Coprocessor) Registers
    // ==========================================
    new structs_1.KeywordDef("st0", "Floating point register 0", enums_1.KeywordType.register, "st0", 0),
    new structs_1.KeywordDef("st1", "Floating point register 1", enums_1.KeywordType.register, "st1", 0),
    new structs_1.KeywordDef("st2", "Floating point register 2", enums_1.KeywordType.register, "st2", 0),
    new structs_1.KeywordDef("st3", "Floating point register 3", enums_1.KeywordType.register, "st3", 0),
    new structs_1.KeywordDef("st4", "Floating point register 4", enums_1.KeywordType.register, "st4", 0),
    new structs_1.KeywordDef("st5", "Floating point register 5", enums_1.KeywordType.register, "st5", 0),
    new structs_1.KeywordDef("st6", "Floating point register 6", enums_1.KeywordType.register, "st6", 0),
    new structs_1.KeywordDef("st7", "Floating point register 7", enums_1.KeywordType.register, "st7", 0),
    new structs_1.KeywordDef("fwait", "Check for pending FPU exceptions", enums_1.KeywordType.instruction, "fwait", 0)
];