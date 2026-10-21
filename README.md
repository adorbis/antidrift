<div align="center">

<img src="https://static.wixstatic.com/media/aec640_65cb8c2dccf448bab431f8fdf05d0a85~mv2.jpg" alt="Anti-Drift Shield" width="600" />

# Anti-Drift Shield

**Stop AI coding agents from lying about what they built.**

[![npm version](https://img.shields.io/npm/v/antidrift.svg?color=075CE5)](https://www.npmjs.com/package/antidrift)
[![npm downloads](https://img.shields.io/npm/dm/antidrift.svg)](https://www.npmjs.com/package/antidrift)
[![License](https://img.shields.io/badge/license-Apache--2.0-00B9E8.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-16E875.svg)](https://nodejs.org)
[![GitHub stars](https://img.shields.io/github/stars/adorbis/antidrift.svg?style=social)](https://github.com/adorbis/antidrift)

[Installation Guide](#installation-guide) · [Quick Start](#quick-start) · [CLI Reference](#cli-reference) · [AI Agents](#using-with-ai-agents) · [Config](#configuration)

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

`antidrift` is a verification engine that sits between your AI agent and `git commit`. It **physically verifies every claim** against your codebase.

| Check | What it catches |
|-------|----------------|
| **Orphans** | Files created on disk, never imported anywhere |
| **Stubs** | `// TODO`, `// FIXME`, `throw new Error("Not implemented")` |
| **Type errors** | `tsc --noEmit`, `cargo check`, `go build`, `compileall` |
| **Worktrees** | Detached HEADs, uncommitted junk |
| **Package drift** | Unrequested `package.json` / lockfile changes |
| **False claims** | "I built X" / "X is wired" verified against reality |
| **Repeated claims** | Same lie told twice without progress |

If any check fails, `antidrift verify` **blocks the commit**.

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
