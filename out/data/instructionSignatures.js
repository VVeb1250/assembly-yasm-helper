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
    sub: [
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
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.REG, SIG.IMM]
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
       SHIFT / ROTATE
    ======================== */
    shl: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    shr: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    sal: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    sar: [
        [SIG.REG, SIG.IMM],
        [SIG.REG, SIG.REG],
        [SIG.MEM, SIG.IMM]
    ],
    rol: [
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.IMM]
    ],
    ror: [
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.IMM]
    ],
    rcl: [
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.IMM]
    ],
    rcr: [
        [SIG.REG, SIG.IMM],
        [SIG.MEM, SIG.IMM]
    ],
    shld: [
        [SIG.REG, SIG.REG, SIG.IMM]
    ],
    shrd: [
        [SIG.REG, SIG.REG, SIG.IMM]
    ],

    /* =======================
       CONTROL FLOW
    ======================== */
    jmp: [
        [SIG.LABEL]
    ],
    call: [
        [SIG.LABEL]
    ],
    ret: [
        []
    ],

    /* =======================
       STACK FRAME
    ======================== */
    enter: [
        [SIG.IMM, SIG.IMM]
    ],
    leave: [
        []
    ],

    /* =======================
       FLAGS
    ======================== */
    clc: [[]],
    stc: [[]],
    cli: [[]],
    sti: [[]],

    /* =======================
       STRING OPERATIONS
    ======================== */
    movsb: [[]],
    movsw: [[]],
    movsd: [[]],

    stosb: [[]],
    stosw: [[]],
    stosd: [[]],

    lodsb: [[]],
    lodsw: [[]],
    lodsd: [[]],

    cmpsb: [[]],
    cmpsw: [[]],
    cmpsd: [[]],

    scasb: [[]],
    scasw: [[]],
    scasd: [[]],

    /* =======================
       SYSTEM
    ======================== */
    int: [
        [SIG.IMM]
    ],
    in: [
        [SIG.REG, SIG.REG],
        [SIG.REG, SIG.IMM]
    ],
    out: [
        [SIG.REG, SIG.REG],
        [SIG.IMM, SIG.REG]
    ],

    nop: [[]],
    hlt: [[]],

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
    jcxz:  [[SIG.LABEL]],
    jecxz: [[SIG.LABEL]],
    jrcxz: [[SIG.LABEL]],

    loop:   [[SIG.LABEL]],
    loope:  [[SIG.LABEL]],
    loopne: [[SIG.LABEL]],

};

module.exports = { INSTRUCTION_SIGNATURES };