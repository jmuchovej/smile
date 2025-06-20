# AGENTS.md

Repo rules for AI agents working on smile.
If there's an `AGENTS.local.md` at the repo root, treat its contents as part of this document and read it before starting any work: @AGENTS.local.md

## Project

This is a fork of [nyuccl/smile](https://github.com/nyuccl/smile) – a Vue 3 + Vite framework for behavioral experiments.
As a custom Vite framework, though, it re-builds many aspects that existing tools like Nuxt already handle.

The goal of this fork is to restructure Smile into a Nuxt module.
This migration favors renames and refactors over rewrites: `git blame` and `git log --follow` are first-class deliverables, not afterthoughts.

## Toolchain

- **Environment**: [devenv](https://devenv.sh) (Nix).
  Enter via `devenv shell`.
  All tooling versions and formatter configuration are defined in `devenv.nix` — do not install tools ad hoc.
- **Packages**: pnpm (see `pnpm-workspace.yaml`).
- **Formatting**: treefmt, configured by `devenv.nix`.
  Run it from inside the devenv shell so everyone formats with the same config.
  Tree-wide normalizations should be recorded in `.git-blame-ignore-revs`.
  You can enable this with `git config blame.ignoreRevsFile .git-blame-ignore-revs`.
- **Markdown prose**: semantic line breaks.
  One sentence per line, never wrapped at a column; a paragraph is a run of such lines.
  The formatter preserves line breaks (`proseWrap: preserve`), so diffs and blame resolve to the sentence that changed and every renderer still joins the lines into a paragraph.

## Commit conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, …).
- One concern per commit.
  In particular, file moves/renames are committed **pure** — no content edits in the same commit — so rename detection and blame stay intact.
  Content changes follow in a separate commit.
- Formatting-only sweeps get their own `chore(dev):` commit and an entry in `.git-blame-ignore-revs`.

## Layout (current)

Upstream's structure is preserved while the port proceeds:

- `src/core/` — timeline, stepper, stores, composables (framework internals)
- `src/builtins/` — built-in experiment views (consent, surveys, etc.)
- `src/uikit/` — shared UI components
- `src/dev/` — developer & presentation mode tooling
- `src/user/` — user-space experiment code
- `docs/` — VitePress documentation

A multi-package layout (`packages/*`) is anticipated later; until then, do not restructure directories opportunistically.
