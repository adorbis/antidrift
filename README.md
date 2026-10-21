You are absolutely right. For a global open-source security tool, that was too brief. A professional README needs to explain **how it works under the hood, why it's safe, how to handle edge cases, and how to contribute.**

Here is the **Massive, Enterprise-Grade README**. It is long, detailed, and leaves no questions unanswered. 

*(Note: Because of the length, you definitely should **not** paste this into your terminal. Use the GitHub web editor method).*

### 🚦 How to update it:
1. Go to **https://github.com/adorbis/antidrift**
2. Click the **Pencil icon** (✏️) next to `README.md`.
3. Press **Cmd+A** to select all, and **Delete** the old text.
4. **Copy the entire block below** and paste it in.
5. Click **Commit changes**.

---

### 📋 Copy this Enterprise-Grade README:

```markdown
<div align="center">

<img src="https://static.wixstatic.com/media/aec640_65cb8c2dccf448bab431f8fdf05d0a85~mv2.jpg" alt="Anti-Drift Shield" width="600" />

# Anti-Drift Shield

**Stop AI coding agents from lying about what they built.**

[![npm version](https://img.shields.io/npm/v/antidrift.svg?color=075CE5)](https://www.npmjs.com/package/antidrift)
[![npm downloads](https://img.shields.io/npm/dm/antidrift.svg)](https://www.npmjs.com/package/antidrift)
[![License](https://img.shields.io/badge/license-Apache--2.0-00B9E8.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-16E875.svg)](https://nodejs.org)
[![GitHub stars](https://img.shields.io/github/stars/adorbis/antidrift.svg?style=social)](https://github.com/adorbis/antidrift)

[Installation](#installation-guide) · [Quick Start](#quick-start) · [How It Works](#how-it-works) · [AI Agents](#using-with-ai-agents) · [Troubleshooting](#troubleshooting)

</div>

---

## The Problem: AI Drift & Ghost Wiring

You ask Claude Code, Cursor, or Antigravity to build a feature. It says:

> *"Done — I've created the auth component and wired it into the app."*

You check. The file exists. You trust it. You commit. You move on.

Three weeks later at merge time, you discover:

- The file was **never imported anywhere** (orphaned)
- Half its functions are `// TODO` stubs
- The "wired" claim was a **hallucination**

You spend a week untangling. Multiply by every AI session across the project. **That's months of your life.**

This is **AI drift**. It's silent, expensive, and universal.

---

## The Solution

`antidrift` is a zero-trust verification engine that sits between your AI agent and `git commit`. It **physically verifies every claim** against your codebase before the code is allowed into Git history.

| Check | What it catches |
|-------|----------------|
| **Orphans** | Files created on disk, never imported anywhere (TS/JS AST) |
| **Stubs** | `// TODO`, `// FIXME`, `throw new Error("Not implemented")` |
| **Type errors** | `tsc --noEmit`, `cargo check`, `go build`, `python compileall` |
| **Worktrees** | Detached HEADs, uncommitted junk |
| **Package drift** | Unrequested `package.json` / lockfile changes |
| **False claims** | "I built X" / "X is wired" verified against reality |
| **Repeated claims** | Same lie told twice without progress |

If any check fails, `antidrift verify` **blocks the commit**.

---

## How It Works (The Architecture)

`antidrift` is not a linter. It is a multi-layered verification protocol. Here is exactly what happens when you run `antidrift verify` or try to run `git commit`:

1. **Git Diffing:** It checks `git status -uall` to find every file you (or the AI) have modified or created.
2. **Language Router:** It auto-detects your project type by looking at the root directory (`tsconfig.json`, `requirements.txt`, `Cargo.toml`, `go.mod`).
3. **Type Verification:** It runs the native compiler for your stack (e.g., `tsc --noEmit`, `cargo check`). If the code doesn't compile, the commit is blocked.
4. **Universal Stub Scanner:** It parses the AST (for TS) or uses a regex engine (for Python, Rust, Go, Java) to find `TODO`s and `NotImplemented` exceptions.
5. **Orphan Detection (AST):** Using `ts-morph`, it builds a dependency graph. If a file exists but is not imported by an entrypoint (`page.tsx`, `index.ts`, `app.py`, etc.), it is flagged as "ghost wiring" and deleted or fixed.
6. **Claim Verification:** It checks the `shield claim` registry against the disk. If the AI said it built `AuthButton.tsx`, the file must exist and be properly wired.
7. **AI Rule Injection:** It writes guardrails directly into `.cursorrules`, `.clinerules`, `.antigravity/rules.md`, and `CLAUDE.md`, training the AI *before* it writes the code.

---

## Compatible Languages & Frameworks

We use a zero-bloat hybrid architecture. We do not pack heavy parsers into `node_modules`. We rely on the native compilers already installed on your machine.

| Stack | Stub Detection | Type Check | Orphan/Wiring Detection |
|-------|:---:|:---:|:---:|
| **TypeScript / JS** | ✅ Full | ✅ Full (`tsc`) | ✅ Full (AST) |
| **Python** | ✅ Full | ✅ Full (`compileall`) | ⚠️ Basic |
| **Rust** | ✅ Full | ✅ Full (`cargo check`) | ⚠️ Basic |
| **Go** | ✅ Full | ✅ Full (`go build`) | ⚠️ Basic |
| **Java / C++ / Ruby** | ✅ Full (Regex) | — | — |

*Note: If no configuration files are found, `antidrift` falls back to a universal stub scanner and will not crash.*

---

## Quick Demo

Here is what happens when an AI agent hallucinates and leaves "ghost wiring" (a file with a `// TODO` that isn't imported anywhere):

```bash
$ antidrift goal "Add user profile settings page"

# ... your AI agent builds the feature and claims it's done ...

$ antidrift verify

[SHIELD: VERIFYING]
  Goal: Add user profile settings page

  Files checked: 1
    • src/components/ProfileSettings.tsx

[ORPHANED FILES — never imported anywhere]
  ✗ src/components/ProfileSettings.tsx

[STUBS DETECTED — TODO / FIXME / Not-implemented]
  ✗ src/components/ProfileSettings.tsx

[STATUS: DRIFT DETECTED]
Fix the above before committing.
```

The AI is now forced to fix the missing imports and remove the `// TODO` before it can declare the task complete.

---

## Installation Guide

### Prerequisites
- **Node.js**: Version 18.0.0 or higher ([Download here](https://nodejs.org)).
- **Git**: Required for the pre-commit hook to function.

### Option 1: Global Installation (Recommended)
Install it globally via npm to use `antidrift` across all your projects:

```bash
npm install -g antidrift
```

**macOS users (via Homebrew):**
```bash
brew install adorbis/tap/antidrift
```

**Windows users (via Scoop):**
```powershell
scoop bucket add adorbis https://github.com/adorbis/scoop-bucket
scoop install antidrift
```

### Option 2: Local Development (For contributors)
```bash
git clone https://github.com/adorbis/antidrift.git
cd antidrift
npm install
npm run build
npm link  # Links the local build globally
```

### Verify Installation
```bash
antidrift --version
antidrift --help
```

---

## Quick Start

```bash
cd your-project

# 1. Initialize the hook and AI rules
antidrift init

# 2. Set your objective
antidrift goal "What you're building"

# 3. When the AI claims it's done, verify:
antidrift verify

# 4. Archive the milestone when complete
antidrift complete
```

Every `git commit` from now on is physically verified by the pre-commit hook.

---

## CLI Reference

| Command | Description |
|---|---|
| `antidrift init` | Install pre-commit hook + inject AI guardrails + create config |
| `antidrift goal "<text>"` | Set the active objective (records start commit) |
| `antidrift claim "<text>"` | Register a claim the AI made |
| `antidrift verify` | Full audit: orphans, stubs, types, worktrees, packages, claims |
| `antidrift complete` | Re-verify, then archive the milestone report |
| `antidrift list` | Show all objectives |

### Lifecycle Commands
| Command | Description |
|---|---|
| `antidrift status` | Show whether the hook is installed, paused, or active |
| `antidrift pause` | Temporarily pause verification |
| `antidrift resume` | Re-enable verification after a pause |
| `antidrift disable` | Remove the pre-commit hook (backup kept) |

**Emergency bypass:**
If you need to commit an urgent hotfix and the tool is blocking you, run `antidrift pause`, commit, then `antidrift resume`. This is cleaner than `git commit --no-verify` because it's explicit and self-documenting.

---

## Using with AI Agents (Cursor, Antigravity, Claude Code)

**Important:** Do NOT ask your AI agent to run `npm install -g antidrift` or `antidrift init`. Modern AI agents (correctly) block global installations and git hook modifications to prevent prompt injection.

**You (the human) must run the setup:**
1. Run `npm install -g antidrift` in your terminal.
2. Run `antidrift init` in your project root.

**Then, tell your AI agent to verify its work.** 
Once the rules are injected into `.antigravity/rules.md` or `.cursorrules`, give your agent this prompt:

> *"The Anti-Drift Shield is active. Before you ever declare a task complete or ask me to commit, you MUST run `antidrift verify` in the terminal and show me the output. If it says `[STATUS: DRIFT DETECTED]`, fix the orphans or stubs before finishing."*

The AI will run the verify command, catch its own "ghost wiring," and fix it *before* handing the code back to you.

---

## Configuration (`.shieldrc.json`)

`antidrift` reads `.shieldrc.json` from your project root. `antidrift init` creates it with sensible defaults:

```json
{
  "tsconfigPath": "./tsconfig.json",
  "entrypointPatterns": ["page.", "route.", "layout.", "index.", "main.", "app.", "serve."],
  "stubMarkers": ["// TODO", "// FIXME", "throw new Error(\"Not implemented\")"],
  "ignorePatterns": [
    "node_modules/", 
    "dist/", 
    ".next/", 
    "*.test.ts", 
    ".cursorrules", 
    ".clinerules", 
    ".windsurfrules",
    ".antigravity/"
  ],
  "enableTypeCheck": true
}
```

---

## Troubleshooting & Edge Cases

- **"No tsconfig.json found"**: `antidrift` will warn you and fall back to a default TypeScript parser to ensure it still catches orphans and stubs in brand-new projects.
- **Monorepos**: If your backend is in a subfolder (e.g., `./backend/`), just update the `"tsconfigPath"` in `.shieldrc.json` to point to it.
- **False Positives on AI Rules**: By default, `.cursorrules`, `.clinerules`, `.windsurfrules`, and `.antigravity/` are ignored by the stub scanner so it doesn't accidentally flag the rule explanations themselves.
- **Updating**: Run `npm install -g antidrift@latest`. You only need to run `antidrift init` again if the hook script itself changes.

---

## Contributing

We welcome contributions! If you want to add support for a new language (like Ruby or C#), fix a bug, or improve the AST parser:
1. Fork the repo and clone it locally.
2. Run `npm install` and `npm run build`.
3. Create a feature branch and submit a Pull Request. 
Please ensure `antidrift verify` passes on your own code before submitting.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

<div align="center">
  <sub>Built with care by <a href="https://github.com/adorbis">Adorbis</a> — because shipping real code shouldn't require reading tea leaves.</sub>
</div>
```
