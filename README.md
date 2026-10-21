<div align="center">

<img src="https://static.wixstatic.com/media/aec640_65cb8c2dccf448bab431f8fdf05d0a85~mv2.jpg" alt="Anti-Drift Shield" width="600" />

# Anti-Drift Shield

**Stop AI coding agents from lying about what they built.**

[![npm version](https://img.shields.io/npm/v/antidrift.svg?color=075CE5)](https://www.npmjs.com/package/antidrift)
[![npm downloads](https://img.shields.io/npm/dm/antidrift.svg)](https://www.npmjs.com/package/antidrift)
[![License](https://img.shields.io/badge/license-Apache--2.0-00B9E8.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-16E875.svg)](https://nodejs.org)
[![GitHub stars](https://img.shields.io/github/stars/adorbis/antidrift.svg?style=social)](https://github.com/adorbis/antidrift)

[The Problem](#the-problem) · [The Solution](#the-solution) · [How It Works](#how-it-works) · [Installation](#installation-guide-complete-step-by-step) · [Quick Start](#quick-start) · [CLI Reference](#cli-reference) · [AI Agents](#using-with-ai-agents) · [FAQ](#troubleshooting--faq)

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

This is **AI drift**. It happens because LLMs suffer from context degradation over long sessions. They lose track of the original objective, hallucinate success, and leave "ghost wiring" behind. It is silent, expensive, and universal.

---

## The Solution

`antidrift` is a zero-trust verification engine that sits between your AI agent and `git commit`. It **physically verifies every claim** against your codebase before the code is allowed into Git history. 

It is not a linter. It is a pre-commit gatekeeper and a rule-injector.

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

`antidrift` is a multi-layered verification protocol. Here is exactly what happens when you run `antidrift verify` or try to run `git commit`:

1. **Git Diffing:** It checks `git status -uall` to find every file you (or the AI) have modified, created, or staged.
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
