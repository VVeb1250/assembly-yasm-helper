"use strict";

const { OperandType } = require("./operandTypes");

const SIG = OperandType;

const INSTRUCTION_SIGNATURES = {

    /* =======================
       DATA MOVEMENT
    ======================== */
    mov: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.MEM, SIG.REG],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.IMM]
    ],
    movzx: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM]
    ],
    movsx: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM]
    ],
    movsxd: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM]
    ],
    lea: [
        [SIG.REG, SIG.MEM]
    ],
    xchg: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.MEM, SIG.REG]
    ],
    xadd: [
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.REG]
    ],
    cmpxchg: [
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.REG]
    ],
    push: [
        [SIG.REG],
        [SIG.MEM],
        [SIG.IMM]
    ],
    pop: [
        [SIG.REG],
        [SIG.MEM]
    ],

    /* =======================
       ARITHMETIC
    ======================== */
    add: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    adc: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    sub: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    sbb: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    mul: [
        [SIG.REG],
        [SIG.MEM]
    ],
    imul: [
        [SIG.REG],
        [SIG.MEM],
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.REG, SIG.IMM],
        [SIG.REG, SIG.MEM, SIG.IMM]
    ],
    div: [
        [SIG.REG],
        [SIG.MEM]
    ],
    idiv: [
        [SIG.REG],
        [SIG.MEM]
    ],
    inc: [
        [SIG.REG],
        [SIG.MEM]
    ],
    dec: [
        [SIG.REG],
        [SIG.MEM]
    ],
    neg: [
        [SIG.REG],
        [SIG.MEM]
    ],

    /* =======================
       SIGN EXTENSION
    ======================== */
    cbw:  [[]],
    cwd:  [[]],
    cwde: [[]],
    cdq:  [[]],
    cdqe: [[]],
    cqo:  [[]],

    /* =======================
       LOGIC
    ======================== */
    and: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    or: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    xor: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    not: [
        [SIG.REG],
        [SIG.MEM]
    ],

    /* =======================
       COMPARISON
    ======================== */
    cmp: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    test: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],

    /* =======================
       BIT OPERATIONS
    ======================== */
    bswap: [
        [SIG.REG]
    ],
    bt: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    bts: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    btr: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    btc: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    bsf: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM]
    ],
    bsr: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.MEM]
    ],

    /* =======================
       SHIFT / ROTATE
    ======================== */
    shl: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM],
        [SIG.MEM, SIG.REG]
    ],
    shr: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM],
        [SIG.MEM, SIG.REG]
    ],
    sal: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM],
        [SIG.MEM, SIG.REG]
    ],
    sar: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM],
        [SIG.MEM, SIG.REG]
    ],
    rol: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM],
        [SIG.MEM, SIG.REG]
    ],
    ror: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM],
        [SIG.MEM, SIG.REG]
    ],
    rcl: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM],
        [SIG.MEM, SIG.REG]
    ],
    rcr: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM],
        [SIG.MEM, SIG.REG]
    ],
    shld: [
        [SIG.REG, SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG, SIG.REG],
        [SIG.MEM, SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG, SIG.REG]
    ],
    shrd: [
        [SIG.REG, SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG, SIG.REG],
        [SIG.MEM, SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.REG, SIG.REG]
    ],

    /* =======================
       CONTROL FLOW
    ======================== */
    jmp: [
        [SIG.LABEL],
        [SIG.REG],
        [SIG.MEM]
    ],
    call: [
        [SIG.LABEL],
        [SIG.REG],
        [SIG.MEM]
    ],
    ret: [
        [],
        [SIG.IMM]
    ],

    /* =======================
       STACK FRAME
    ======================== */
    enter: [
        [SIG.IMM, SIG.IMM]
    ],
    leave: [[]],

    /* =======================
       FLAGS
    ======================== */
    clc:  [[]],
    stc:  [[]],
    cmc:  [[]],
    cli:  [[]],
    sti:  [[]],
    cld:  [[]],
    std:  [[]],
    lahf: [[]],
    sahf: [[]],
    pushf:  [[]],
    popf:   [[]],
    pushfq: [[]],
    popfq:  [[]],

    /* =======================
       STRING OPERATIONS
    ======================== */
    movsb: [[]],
    movsw: [[]],
    movsd: [[]],
    movsq: [[]],

    stosb: [[]],
    stosw: [[]],
    stosd: [[]],
    stosq: [[]],

    lodsb: [[]],
    lodsw: [[]],
    lodsd: [[]],
    lodsq: [[]],

    cmpsb: [[]],
    cmpsw: [[]],
    cmpsd: [[]],
    cmpsq: [[]],

    scasb: [[]],
    scasw: [[]],
    scasd: [[]],
    scasq: [[]],

    /* =======================
       SYSTEM
    ======================== */
    syscall:  [[]],
    sysret:   [[]],
    sysenter: [[]],
    sysexit:  [[]],
    int: [
        [SIG.IMM]
    ],
    into:  [[]],
    iret:  [[]],
    iretd: [[]],
    iretq: [[]],
    in: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.IMM]
    ],
    out: [
        [SIG.REG, SIG.REG],
        [SIG.IMM, SIG.REG]
    ],
    rdtsc:  [[]],
    rdtscp: [[]],
    cpuid:  [[]],
    nop:    [[]],
    hlt:    [[]],
    ud2:    [[]],
    pause:  [[]],
    lfence: [[]],
    mfence: [[]],
    sfence: [[]],
    xlatb:  [[]],

    /* =======================
       CONDITIONAL JUMPS
    ======================== */
    je:    [[SIG.LABEL]],
    jne:   [[SIG.LABEL]],
    jz:    [[SIG.LABEL]],
    jnz:   [[SIG.LABEL]],
    jg:    [[SIG.LABEL]],
    jl:    [[SIG.LABEL]],
    jge:   [[SIG.LABEL]],
    jle:   [[SIG.LABEL]],
    ja:    [[SIG.LABEL]],
    jb:    [[SIG.LABEL]],
    jae:   [[SIG.LABEL]],
    jbe:   [[SIG.LABEL]],
    jc:    [[SIG.LABEL]],
    jnc:   [[SIG.LABEL]],
    js:    [[SIG.LABEL]],
    jns:   [[SIG.LABEL]],
    jo:    [[SIG.LABEL]],
    jno:   [[SIG.LABEL]],
    jp:    [[SIG.LABEL]],
    jnp:   [[SIG.LABEL]],
    jpe:   [[SIG.LABEL]],
    jpo:   [[SIG.LABEL]],
    jcxz:  [[SIG.LABEL]],
    jecxz: [[SIG.LABEL]],
    jrcxz: [[SIG.LABEL]],

    loop:   [[SIG.LABEL]],
    loope:  [[SIG.LABEL]],
    loopne: [[SIG.LABEL]],

};

module.exports = { INSTRUCTION_SIGNATURES };