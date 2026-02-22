"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Label = exports.Macro = exports.Procedure = exports.Info = exports.KeywordDef = void 0;
const enums_1 = require("./enums");
class KeywordDef {
    constructor(name, def, type = enums_1.KeywordType.instruction, data, count = 2, allow) {
        this.def = def;
        if (data !== undefined) {
            this.data = data;
        }
        else {
            this.data = name + " [operand], [operand]";
        }
        if (allow === undefined) {
            this.allowType = enums_1.AllowKinds.inst;
        }
        else {
            this.allowType = allow;
        }
        this.opCount = count;
        this.type = type;
        this.name = name;
    }
}
exports.KeywordDef = KeywordDef;
class Info {
    constructor(name, des, param = [], output = []) {
        this.des = des;
        this.name = name;
        this.params = param;
        this.output = output;
    }
    paramsString() {
        let out = "";
        for (const param of this.params) {
            out += "push [" + param + "]\n";
        }
        out += "call " + this.name;
        return out;
    }
    paramsStringMac() {
        let out = this.name + " ";
        for (let i = 0; i < this.params.length; i++) {
            const param = this.params[i];
            out += "[" + param + "]";
            if (i !== this.params.length - 1) {
                out += ", ";
            }
        }
        return out;
    }
    outputs() {
        let h = "";
        for (let i = 0; i < this.output.length; i++) {
            const out = this.output[i];
            h += out + "\n";
        }
        return h;
    }
    /**
     * asMarkedText
     */
    asMarkedText(asMacro = false) {
        return [{
                language: "plainText",
                value: this.des
            }, {
                language: "assembly",
                value: asMacro ? (this.name + " " + this.paramsStringMac()) : (this.paramsString)
            }, {
                language: "assembly",
                value: this.output.length > 0 ? ("Output:\n" + this.outputs()) : ""
            }];
    }
}
exports.Info = Info;
class Procedure {
    constructor(name, des, status = "near") {
        this.name = name;
        this.description = des;
        this.status = status;
    }
}
exports.Procedure = Procedure;
class Macro {
    constructor(name, short, des) {
        this.name = name;
        this.short = short;
        if (des === undefined) {
            this.des = new Info(name, "");
        }
        else {
            this.des = des;
        }
    }
}
exports.Macro = Macro;
class Label {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }
}
exports.Label = Label;
//# sourceMappingURL=structs.js.map