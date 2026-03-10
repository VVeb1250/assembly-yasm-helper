"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYWORD_DICTIONARY = exports.REGISTERS = exports.PREPROCESSOR = exports.AVX_REGISTERS = void 0;
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
// AVX / AVX-512 registers (generated dynamically)
exports.AVX_REGISTERS = [
    ...Array.from({length: 16}, (_, i) => `ymm${i}`),  // AVX (ymm0-ymm15)
    ...Array.from({length: 32}, (_, i) => `zmm${i}`),  // AVX-512 (zmm0-zmm31)
    ...Array.from({length: 8},  (_, i) => `k${i}`),    // AVX-512 mask (k0-k7)
];
exports.PREPROCESSOR = [
    { name: "%include",  detail: "(Preprocessor)", doc: "Include another file" },
    { name: "%macro",    detail: "(Preprocessor)", doc: "Define a multi-line macro" },
    { name: "%endmacro", detail: "(Preprocessor)", doc: "End macro definition" },
    { name: "%define",   detail: "(Preprocessor)", doc: "Define a single-line macro" },
    { name: "%assign",   detail: "(Preprocessor)", doc: "Define a numeric macro" },
    { name: "%undef",    detail: "(Preprocessor)", doc: "Undefine a macro" },
    { name: "%ifdef",    detail: "(Preprocessor)", doc: "If macro is defined" },
    { name: "%ifndef",   detail: "(Preprocessor)", doc: "If macro is not defined" },
    { name: "%if",       detail: "(Preprocessor)", doc: "Conditional assembly" },
    { name: "%elif",     detail: "(Preprocessor)", doc: "Else if condition" },
    { name: "%else",     detail: "(Preprocessor)", doc: "Else branch" },
    { name: "%endif",    detail: "(Preprocessor)", doc: "End conditional block" },
    { name: "%rep",      detail: "(Preprocessor)", doc: "Repeat block" },
    { name: "%endrep",   detail: "(Preprocessor)", doc: "End repeat block" },
];

const { KeywordType, AllowKinds } = enums_1;

function INST(name, def, op = 2, allow = AllowKinds.all) {
    return new structs_1.KeywordDef(name, def, KeywordType.instruction, undefined, op, allow);
}
function DIR(name, def, op = 0, allow) {
    return new structs_1.KeywordDef(name, def, KeywordType.savedWord, undefined, op, allow);
}
function MEM(name, def) {
    return new structs_1.KeywordDef(name, def, KeywordType.memoryAllocation, name + " ");
}
function PRE(name, def, op = 0) {
    return new structs_1.KeywordDef(name, def, KeywordType.precompiled, name, op);
}
function SIZE(name, def) {
    return new structs_1.KeywordDef(name, def, KeywordType.size, name, 0);
}
function REG(name, def) {
    return new structs_1.KeywordDef(name, def, KeywordType.register, name, 0);
}

exports.KEYWORD_DICTIONARY = [

/* ================= SECTION / SCOPE ================= */

DIR("section","Defines a section (e.g., section .data)"),
DIR("segment","Defines a segment"),
DIR("global","Declares a global symbol"),
DIR("extern","Declares an external symbol"),
DIR("common","Declares common uninitialized data"),
DIR("default rel","Use RIP-relative addressing"),
DIR("bits","Specify target processor mode"),
DIR("align","Aligns next instruction/data"),

/* ================= MEMORY MODELS ================= */

SIZE("tiny","Code and data in one segment"),
SIZE("small","One code and one data segment"),
SIZE("medium","Multiple code segments"),
SIZE("compact","Multiple data segments"),
SIZE("large","Multiple code and data segments"),
SIZE("huge","Large with >64KB arrays"),
SIZE("flat","Flat 32/64 bit memory model"),
SIZE("stdcall","Standard calling convention"),

/* ================= MEMORY ALLOCATION ================= */

MEM("db","Define byte"),
MEM("dw","Define word"),
MEM("dd","Define doubleword"),
MEM("dq","Define quadword"),
MEM("dt","Define tenbytes"),

MEM("resb","Reserve bytes"),
MEM("resw","Reserve words"),
MEM("resd","Reserve dwords"),
MEM("resq","Reserve qwords"),
MEM("rest","Reserve tenbytes"),

MEM("byte","1 byte memory pointer"),
MEM("word","2 byte memory pointer"),
MEM("dword","4 byte memory pointer"),
MEM("qword","8 byte memory pointer"),
MEM("tbyte","10 byte memory pointer"),

/* ================= TASM DIRECTIVES ================= */

DIR("DATASEG","Start data segment"),
DIR("IDEAL","Switch to IDEAL mode"),
DIR("MASM","Switch to MASM mode"),
DIR("CODESEG","Start code segment"),

new structs_1.KeywordDef(
"MODEL",
"Defines memory model",
KeywordType.savedWord,
"MODEL [size]",
1,
AllowKinds.size
),

new structs_1.KeywordDef(
"STACK",
"Defines stack size",
KeywordType.savedWord,
"STACK [constant]",
1,
AllowKinds.constants
),

/* ================= PREPROCESSOR ================= */

PRE("%macro","Start NASM macro"),
PRE("%endmacro","End NASM macro"),
PRE("%define","Define macro"),
PRE("%include","Include file"),

PRE("macro","Define macro",1),
PRE("endm","End macro"),
PRE("equ","Constant equate"),
PRE("dup","Duplicate values",1),
PRE("include","Include file"),

/* ================= DATA TRANSFER ================= */

INST("mov","Move value"),
INST("movzx","Move with zero extend"),
INST("movsx","Move with sign extend"),
INST("xchg","Exchange operands"),
INST("xadd","Exchange and add"),
INST("cmpxchg","Compare and exchange"),

INST("lea","Load effective address",2,
AllowKinds.variables | AllowKinds.memory),

INST("nop","No operation",0),

/* ================= ARITHMETIC ================= */

INST("add","Add"),
INST("sub","Subtract"),
INST("inc","Increment",1),
INST("dec","Decrement",1),
INST("neg","Negate",1),
INST("cmp","Compare"),
INST("mul","Unsigned multiply",1),
INST("imul","Signed multiply",1),
INST("div","Unsigned divide",1),
INST("idiv","Signed divide",1),

INST("cbw","Convert byte to word",0),
INST("cwd","Convert word to dword",0),
INST("cdq","Convert dword to qword",0),
INST("cqo","Convert qword to octoword",0),

/* ================= LOGIC ================= */

INST("and","Logical AND"),
INST("or","Logical OR"),
INST("xor","Logical XOR"),
INST("not","Bitwise NOT",1),
INST("test","Logical compare"),

INST("shl","Shift left"),
INST("shr","Shift right"),
INST("sal","Arithmetic shift left"),
INST("sar","Arithmetic shift right"),

INST("rol","Rotate left"),
INST("ror","Rotate right"),
INST("rcl","Rotate through carry left"),
INST("rcr","Rotate through carry right"),

INST("shld","Double shift left"),
INST("shrd","Double shift right"),

/* ================= SYSTEM ================= */

INST("int","Software interrupt",1,AllowKinds.constants),
INST("into","Interrupt on overflow",0),
INST("iret","Interrupt return",0),
INST("syscall","System call",0),
INST("sysret","Return from syscall",0),
INST("hlt","Halt processor",0),
INST("in","Input from port"),
INST("out","Output to port"),

/* ================= STACK ================= */

INST("push","Push operand",1),
INST("pop","Pop operand",1),

INST("pushf","Push FLAGS",0),
INST("pushfd","Push EFLAGS",0),
INST("pushfq","Push RFLAGS",0),

INST("popf","Pop FLAGS",0),
INST("popfd","Pop EFLAGS",0),
INST("popfq","Pop RFLAGS",0),

INST("pusha","Push all registers",0),
INST("pushad","Push all registers",0),
INST("popa","Pop all registers",0),
INST("popad","Pop all registers",0),

/* ================= CONTROL FLOW ================= */

INST("jmp","Jump",1,AllowKinds.label),
INST("call","Call procedure",1,AllowKinds.label),
INST("ret","Return",0),

INST("enter","Create stack frame",2),
INST("leave","Destroy stack frame",0),

INST("je","Jump if equal",1,AllowKinds.label),
INST("jne","Jump if not equal",1,AllowKinds.label),
INST("ja","Jump if above",1,AllowKinds.label),
INST("jae","Jump if above or equal",1,AllowKinds.label),
INST("jb","Jump if below",1,AllowKinds.label),
INST("jbe","Jump if below or equal",1,AllowKinds.label),

INST("jg","Jump if greater",1,AllowKinds.label),
INST("jge","Jump if greater or equal",1,AllowKinds.label),
INST("jl","Jump if less",1,AllowKinds.label),
INST("jle","Jump if less or equal",1,AllowKinds.label),

INST("jc","Jump if carry",1,AllowKinds.label),
INST("jnc","Jump if not carry",1,AllowKinds.label),
INST("jz","Jump if zero",1,AllowKinds.label),
INST("jnz","Jump if not zero",1,AllowKinds.label),

INST("js","Jump if sign",1,AllowKinds.label),
INST("jns","Jump if not sign",1,AllowKinds.label),

INST("jo","Jump if overflow",1,AllowKinds.label),
INST("jno","Jump if not overflow",1,AllowKinds.label),

INST("jcxz","Jump if CX zero",1,AllowKinds.label),
INST("jecxz","Jump if ECX zero",1,AllowKinds.label),
INST("jrcxz","Jump if RCX zero",1,AllowKinds.label),

/* ================= STRING OPS ================= */

INST("rep","Repeat instruction",1),
INST("repz","Repeat if zero",1),
INST("repnz","Repeat if not zero",1),

INST("cld","Clear direction flag",0),
INST("std","Set direction flag",0),

INST("scasb","Scan byte",0),
INST("scasw","Scan word",0),
INST("scasd","Scan dword",0),
INST("scasq","Scan qword",0),

INST("cmpsb","Compare byte strings",0),
INST("cmpsw","Compare word strings",0),
INST("cmpsd","Compare dword strings",0),
INST("cmpsq","Compare qword strings",0),

INST("stosb","Store byte string",0),
INST("stosw","Store word string",0),
INST("stosd","Store dword string",0),
INST("stosq","Store qword string",0),

INST("lodsb","Load byte string",0),
INST("lodsw","Load word string",0),
INST("lodsd","Load dword string",0),
INST("lodsq","Load qword string",0),

INST("movsb","Move byte string",0),
INST("movsw","Move word string",0),
INST("movsd","Move dword string",0),
INST("movsq","Move qword string",0),

/* ================= LOOPS ================= */

INST("loop","Loop until RCX=0",1,AllowKinds.label),
INST("loope","Loop while equal",1,AllowKinds.label),
INST("loopne","Loop while not equal",1,AllowKinds.label),

/* ================= FLAGS ================= */

INST("stc","Set carry flag",0),
INST("clc","Clear carry flag",0),
INST("cmc","Complement carry flag",0),

INST("sti","Enable interrupts",0),
INST("cli","Disable interrupts",0),

INST("lahf","Load flags into AH",0),
INST("sahf","Store AH into flags",0),

/* ================= LEGACY ================= */

INST("daa","Decimal adjust after add",0),
INST("das","Decimal adjust after sub",0),
INST("aaa","ASCII adjust after add",0),
INST("aas","ASCII adjust after sub",0),
INST("aam","ASCII adjust after multiply",0),
INST("aad","ASCII adjust before divide",0),

/* ================= STRUCTURES ================= */

PRE("proc","Define procedure"),
PRE("endp","End procedure"),
PRE("struc","Define structure"),
PRE("ends","End structure"),

/* ================= FPU ================= */

REG("st0","FPU register 0"),
REG("st1","FPU register 1"),
REG("st2","FPU register 2"),
REG("st3","FPU register 3"),
REG("st4","FPU register 4"),
REG("st5","FPU register 5"),
REG("st6","FPU register 6"),
REG("st7","FPU register 7"),

INST("fwait","Wait for FPU",0)

];