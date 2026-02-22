# Assembly YASM Helper

Welcome to **Assembly YASM Helper**! This extension provides advanced language support, syntax highlighting, and highly intelligent autocomplete for **YASM / NASM** assembly development in Visual Studio Code.

## 🚀 Key Features

* **Broad File Support:** Fully supports standard `.asm` files as well as `.s` and `.S` extensions commonly used with YASM/GCC.
* **Intelligent Autocomplete (Context-Aware):**
  * **`.data` & `.bss` Sections:** Smart suggestions for memory allocation (`db`, `dw`, `resb`, etc.) that only trigger *after* you finish typing your variable name and press Space/Tab.
  * **`.text` Section:** Context-aware suggestions for instructions like `mov`, `add`, `mul`, `div`, etc. Automatically suggests Registers, defined Variables, and Pointer Sizes (`byte`, `word`, `dword`, `qword`).
  * **Bracket Intelligence `[]`:** When typing inside memory brackets (e.g., `dword[`), the extension filters out unnecessary keywords and strictly suggests your defined **Variables**.
  * **Root-Level Suggestions:** Suggests structural keywords like `section .data`, `global`, and `extern` only when you are at the beginning of a line (no indentation), keeping your code clean.
* **Unobtrusive Typing:** Removed annoying popups immediately after commas (`,`). Suggestions now smartly wait for you to press Space or Tab.
* **Fixed Syntax Highlighting:** Consistent and clean syntax highlighting for variables (regardless of length) and modern YASM directives.

## 📦 How to Install (Manual VSIX)

1. Download the `.vsix` file provided.
2. Open Visual Studio Code.
3. Go to the **Extensions** view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
4. Click on the `...` (Views and More Actions) button at the top right of the Extensions panel.
5. Select **Install from VSIX...**
6. Locate the downloaded `.vsix` file and install.
7. Restart VS Code and enjoy coding!

## ⚙️ Requirements
* Visual Studio Code v1.48.0 or higher.

## 👨‍💻 Publisher
Developed by **Roncho** and customized for smooth YASM Assembly coding by **Roncho**.