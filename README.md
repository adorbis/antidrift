 <div align="center">

<img src="https://static.wixstatic.com/media/aec640_65cb8c2dccf448bab431f8fdf05d0a85~mv2.jpg" alt="Anti-Drift Shield" width="560" />

# Anti-Drift Shield

### Verifiable Engineering for AI-Assisted Software Development

**Stop AI coding agents from claiming success without verifiable evidence.**

Anti-Drift Shield is a verification and enforcement tool designed to detect incomplete implementations, orphaned files, unfulfilled claims, and code-quality issues before changes enter Git history.

[![npm version](https://img.shields.io/npm/v/antidrift.svg?color=075CE5)](https://www.npmjs.com/package/antidrift)
[![npm downloads](https://img.shields.io/npm/dm/antidrift.svg)](https://www.npmjs.com/package/antidrift)
[![License](https://img.shields.io/badge/License-Apache--2.0-00B9E8.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933.svg)](https://nodejs.org/)
[![GitHub](https://img.shields.io/github/stars/adorbis/antidrift?style=social)](https://github.com/adorbis/antidrift)

[Problem](#the-problem) · [Solution](#the-solution) · [Architecture](#how-it-works) · [Installation](#installation) · [Quick Start](#quick-start) · [CLI](#cli-reference) · [AI Agents](#integration-with-ai-coding-agents) · [Contributing](#contributing)

</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Core Capabilities](#core-capabilities)
- [How It Works](#how-it-works)
- [Supported Languages](#supported-languages)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Reference](#cli-reference)
- [Integration with AI Coding Agents](#integration-with-ai-coding-agents)
- [Configuration](#configuration)
- [Example Verification](#example-verification)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

AI coding agents can generate code quickly, but generated code is not necessarily complete, connected, or correct.

An agent may report that a feature is finished even when:

- A newly created file is never imported or used.
- Critical functions contain unfinished implementations or placeholder logic.
- A change does not compile or pass the relevant checks.
- Package manifests or lockfiles contain unintended changes.
- A declared implementation cannot be verified against the repository.
- Repeated sessions report progress without delivering the required result.

These failures create **AI drift**: a growing gap between what an AI agent claims to have implemented and what the codebase actually contains.

The consequences include wasted engineering time, unreliable commits, difficult reviews, and increased maintenance costs.

## The Solution

Anti-Drift Shield (`antidrift`) introduces a verification layer into the software development workflow.

It combines repository inspection, implementation checks, language-specific validation, claim tracking, and Git pre-commit enforcement to help identify discrepancies before code is committed.

Rather than relying exclusively on an AI agent's completion message, developers can run an explicit verification command against the current working tree.

**The principle is simple: verify the implementation, not just the claim.**

## Core Capabilities

| Capability | Purpose |
|---|---|
| Orphan detection | Identify potentially disconnected TypeScript and JavaScript files. |
| Stub detection | Detect common TODO, FIXME, and not-implemented markers. |
| Language validation | Run applicable compiler or build checks for supported project types. |
| Git worktree inspection | Identify relevant repository-state issues, including detached HEADs and uncommitted changes. |
| Package drift detection | Help identify unintended package manifest and lockfile modifications. |
| Claim verification | Compare registered implementation claims with repository evidence. |
| Progress tracking | Maintain objectives and detect repeated claims without corresponding progress. |
| Pre-commit enforcement | Run configured verification checks before a Git commit proceeds. |
| AI instruction integration | Add project guardrails to supported AI coding-agent configuration files. |
| Milestone reporting | Re-verify work and archive completion reports. |

*Detection and enforcement depend on the project configuration, supported language, and checks implemented by the installed version. A successful verification is not a guarantee that software is defect-free.*

## How It Works

Anti-Drift Shield uses a layered verification workflow.

1. **Repository inspection** — examines the Git working tree and identifies relevant changed, staged, and untracked files.
2. **Project detection** — identifies available project configuration files to select applicable validation checks.
3. **Compiler and build checks** — runs supported native validation tools where applicable.
4. **Stub scanning** — searches for common indicators of unfinished implementations.
5. **Dependency and wiring analysis** — uses TypeScript/JavaScript analysis to identify files that may not be connected to application entry points.
6. **Claim verification** — compares registered claims against available repository evidence.
7. **Git enforcement** — integrates verification into the commit workflow through a pre-commit hook.
8. **AI workflow guidance** — injects supported repository-level instructions to encourage agents to verify their work before reporting completion.

The objective is to make implementation status more observable and to catch common forms of incomplete work before they become part of Git history.

## Supported Languages

The project uses a hybrid approach that combines language-specific analysis with native tooling.

| Language / Stack | Stub Detection | Build or Type Validation | Wiring Analysis |
|---|---|---|---|
| TypeScript / JavaScript | Supported | TypeScript checks where configured | AST-based analysis |
| Python | Supported | Python compilation checks | Basic |
| Rust | Supported | Cargo checks | Basic |
| Go | Supported | Go build checks | Basic |
| Java / C++ / Ruby | Pattern-based | Not listed as supported in the supplied matrix | Not listed as supported in the supplied matrix |

The depth of analysis varies by language. For stacks without dedicated dependency analysis, orphan detection should not be treated as equivalent to the TypeScript/JavaScript analysis.

When a recognized project configuration is unavailable, the tool can fall back to its general stub-scanning behavior.

## Installation

### Prerequisites

- Node.js 18 or later
- npm
- Git
- A local Git repository in which you want to enable verification

Check your installed versions:

```bash
node --version
npm --version
git --version
```

### Install using npm

```bash
npm install -g antidrift
```

Alternatively, use the project's documented package-manager distribution where available.

### Verify the installation

```bash
antidrift --version
```

### Initialize a repository

Navigate to your project root:

```bash
cd /path/to/your/project
```

Initialize Anti-Drift Shield:

```bash
antidrift init
```

Initialization is intended to configure the project's verification hook, applicable AI-agent guardrails, and `.shieldrc.json` configuration.

Review the resulting changes before proceeding.

## Quick Start

Use the following workflow during development.

### 1. Initialize the repository

```bash
antidrift init
```

### 2. Define the active objective

```bash
antidrift goal "Implement user profile settings"
```

### 3. Implement the requested work

Use your preferred editor or AI coding agent.

### 4. Verify the implementation

```bash
antidrift verify
```

Review the verification output and resolve any reported issues.

### 5. Complete the milestone

```bash
antidrift complete
```

The completion command is intended to re-verify the work and archive a milestone report.

**Recommended practice:** Review the Git diff and the verification output before committing important changes.

## CLI Reference

### Core Commands

| Command | Description |
|---|---|
| `antidrift init` | Initialize repository verification and supported AI guardrails. |
| `antidrift goal "<text>"` | Set the active development objective. |
| `antidrift claim "<text>"` | Register an implementation claim. |
| `antidrift verify` | Run the available verification checks. |
| `antidrift complete` | Re-verify and archive the milestone report. |
| `antidrift list` | Display recorded objectives. |

### Lifecycle Commands

| Command | Description |
|---|---|
| `antidrift status` | Inspect the verification lifecycle state. |
| `antidrift pause` | Temporarily pause verification. |
| `antidrift resume` | Re-enable verification. |
| `antidrift disable` | Remove the pre-commit hook while retaining its backup, as supported by the implementation. |

### Emergency workflow

If verification blocks an urgent change, use the explicit pause-and-resume workflow only when appropriate:

```bash
antidrift pause

# Commit the urgent change after reviewing the risks.
git commit -m "Apply urgent hotfix"

antidrift resume
```

Pausing verification reduces protection for the affected commit. Restore verification promptly and run the checks manually where possible.

## Integration with AI Coding Agents

Anti-Drift Shield is designed to complement AI-assisted development workflows, including tools such as Claude Code, Cursor, and Antigravity.

### Recommended setup

Run installation and initialization commands yourself in the intended repository:

```bash
npm install -g antidrift
cd /path/to/your/project
antidrift init
```

Review the generated configuration and AI-agent instruction changes.

### Recommended agent instruction

After setup, give your coding agent the following instruction:

> Before declaring a task complete or asking me to commit, run `antidrift verify` and show the verification output. If verification reports drift, investigate the findings, correct the relevant issues, and run verification again. Do not claim that a feature is implemented or connected unless the available repository evidence supports that claim. Report any remaining failures or limitations explicitly.

This instruction encourages the agent to use repository evidence instead of relying exclusively on its own completion statement.

**Important:** Verification results should be reviewed critically. Passing automated checks does not prove that requirements are fully satisfied, that application behavior is correct, or that security issues are absent.

## Configuration

Anti-Drift Shield uses `.shieldrc.json` in the project root.

An illustrative configuration based on the supplied project documentation is shown below. Prefer the configuration generated by your installed version and verify that its accepted fields match this example.

```json
{
  "tsconfigPath": "./tsconfig.json",
  "entrypointPatterns": [
    "page.",
    "route.",
    "layout.",
    "index.",
    "main.",
    "app.",
    "serve."
  ],
  "stubMarkers": [
    "// TODO",
    "// FIXME",
    "throw new Error(\"Not implemented\")"
  ],
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

### Configuration considerations

- **`tsconfigPath`** — points to the TypeScript configuration used by the project.
- **`entrypointPatterns`** — identifies filename patterns used during entry-point analysis.
- **`stubMarkers`** — lists patterns that may indicate unfinished implementation.
- **`ignorePatterns`** — excludes configured files and directories from applicable scans.
- **`enableTypeCheck`** — controls the configured type-checking behavior where supported.

For monorepos, ensure that the configuration points to the correct application or package. Review ignore patterns carefully so that important production code is not excluded from verification.

## Example Verification

The following is an illustrative example of the kind of finding Anti-Drift Shield is intended to surface.

Suppose an AI agent claims to have implemented a profile settings page but creates a file that is not connected to the application and still contains unfinished logic.

Run:

```bash
antidrift goal "Add user profile settings page"
antidrift verify
```

A verification report might identify:

```text
[SHIELD: VERIFYING]

Goal: Add user profile settings page

[ORPHANED FILES]
  - src/components/ProfileSettings.tsx

[STUBS DETECTED]
  - src/components/ProfileSettings.tsx

[STATUS: DRIFT DETECTED]

Resolve the reported findings before committing.
```

*The output above is illustrative; exact wording and results depend on the installed version and repository state.*

## Troubleshooting

| Issue | Suggested action |
|---|---|
| `command not found: antidrift` | Reopen the terminal and confirm the global npm executable directory is on your `PATH`. |
| `command not found: node` | Install Node.js 18 or later. |
| npm permission errors | Consider using a Node version manager such as nvm rather than changing system-wide permissions. |
| TypeScript configuration not found | Check `tsconfigPath` and confirm the project configuration exists. |
| False-positive orphan reports | Review application entry points, dynamic imports, framework conventions, and ignore settings. |
| Monorepo validation problems | Configure the correct package or application path and run verification from the intended repository root. |
| AI-agent configuration issues | Inspect the generated files and ensure they are supported by your installed agent and Anti-Drift Shield version. |
| Verification blocks a commit | Read the findings, fix or investigate them, and rerun verification before proceeding. |

## Contributing

Contributions that improve verification accuracy, language support, documentation, and developer experience are welcome.

### Development workflow

1. Fork the repository.
2. Clone your fork.
3. Install project dependencies.
4. Create a dedicated feature branch.
5. Implement and test your changes.
6. Run the applicable build and verification checks.
7. Submit a pull request describing the change, its motivation, and the tests performed.

Example:

```bash
git clone https://github.com/adorbis/antidrift.git
cd antidrift

npm install
npm run build

git checkout -b feat/your-change
```

Before submitting a pull request, verify the relevant checks for your change and document any known limitations.

Please consult the repository's contribution instructions, if present, before submitting.

## Security and Reliability

Anti-Drift Shield is intended to improve implementation verification and repository-level development discipline.

It should be used as one layer in a broader engineering process that includes code review, automated tests, security analysis, and deployment validation.

Automated scanning can produce false positives and false negatives. A successful run should not be interpreted as a guarantee of correctness, completeness, or security.

If you discover a security vulnerability, follow the repository's published security reporting process, if one is available.

## License

Anti-Drift Shield is distributed under the **Apache License 2.0**. See the [`LICENSE`](LICENSE) file for the complete terms.

---

<div align="center">

**Anti-Drift Shield**

*Verify what was built. Track what was claimed. Review what gets committed.*

Built by [Adorbis](https://github.com/adorbis).

</div>
