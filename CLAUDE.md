# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

`app/` holds the actual game (React + TypeScript + Vite), started in lab-01 and evolving lab by
lab — see `labs/CURRENT.md` for what's implemented right now. `prompt.md` is the product/market
brief that drives what gets built.

## Commands (in `app/`)

- `npm install` — install dependencies.
- `npm run dev` — start the Vite dev server.
- `npm run build` — typecheck (`tsc -b`) + production build (also generates the PWA manifest/service worker).
- `npm run preview` — serve the production build locally.

There is no test runner configured yet — see `docs/prompts/04-manutencao-clean-code.md` §5 for the
testing bar to introduce as soon as domain logic (quest/reward/entitlement rules) grows past what's
trivially eyeballed.

## Contents

- `README.md` — full project overview: what the game is, live URL, tech stack, architecture,
  feature list, security/privacy posture, and how to run/deploy. Read this first for a "what is
  this" answer; `labs/CURRENT.md` for "what's the state right now."
- `prompt.md` — a structured Portuguese-language brief (market hypotheses, MVP scope, tech stack
  recommendations incl. a .NET/C# backend option, hosting plan, backlog priorities, monetization
  strategy, and an "operational prompt" at the end meant to be fed to a product-design AI session)
  for prototyping an educational game aimed at ~10-year-olds. Sections 7-8 and 15 describe a
  *planned* backend (Supabase/Firebase/Azure, Stripe subscriptions) that was never built — the
  MVP actually implemented stayed frontend-only (`localStorage`, no accounts, no payments); see
  the status note near the top of section 7 and `README.md`'s "Stack técnica" for what's real.
- `docs/prompts/` — engineering-quality standards (Portuguese) that apply across every lab: `01-seguranca.md` (security + child-safety/compliance, MUST items are merge-blocking), `02-design-profissional.md` (game feel, accessibility, design system), `03-arquitetura-sistema.md` (layering: presentation/game vs. domain vs. data-access vs. backend — keep game-rule logic out of UI/engine code), `04-manutencao-clean-code.md` (naming, folder-by-feature, tests, commit hygiene, documenting tech debt in each lab's `CONTEXT.md`). Read `docs/prompts/README.md` first. Apply these when writing or reviewing any game code — they're the quality bar, not optional style notes.
- `app/` — the game itself (React + TypeScript + Vite + Babylon.js/Havok), plus `app/server/`
  (legacy Node relay, Fly.io, suspended — see its `README.md`) and `app/server-cf-relay/` (active
  multiplayer relay, Cloudflare Workers + Durable Objects — see its `README.md` for architecture,
  hosting, and Free-tier capacity). Structure and current stack are whatever the latest lab's
  `CONTEXT.md` documents (stack can change between labs, e.g. 2D→3D pivots — check before assuming).
- `labs/` — the iteration workflow for implementation work (see below).

## Working in this repo

- `prompt.md` is the source of truth for product *direction* (the "why"/"what for"), not for
  current implementation status — see the divergence note above. Section 13 ("Entregáveis
  esperados da prototipação") lists the deliverables expected from prototyping work: game
  proposal, lean GDD, technical architecture, sprint plan, and a Play-Store-free launch plan.
  Section 14 contains the exact operational prompt intended to drive that work. Section 15 covers
  the monetization strategy (parent-facing subscription, never gating educational content —
  modeled on Prodigy Math Game) — planned, not implemented.
- The stack actually running today is Babylon.js + Havok (3D/physics, since lab-02) + React/Vite,
  no backend/database — see `README.md`'s "Stack técnica" section, which supersedes the Section 7
  options in `prompt.md` for anything already built. Section 11's child-safety constraints (no
  open chat, language filtering, data minimization) DO apply to the current build and are already
  implemented (closed chat catalog, nickname-only identity — see `README.md`'s "Segurança" section).
- Domain logic (quest data, progression/reward rules, entitlements) must stay decoupled from the rendering engine (Babylon.js) per `docs/prompts/03-arquitetura-sistema.md` §1 — this is what let lab-02 swap the 2D hub for a 3D one without touching `quests.ts`/`progression.ts`.

## Skills

- **`lab`** (`.claude/skills/lab/SKILL.md`, project-local) is the only skill actively used for
  this project's own workflow — see "Development workflow" below. Invoke it whenever the user
  asks to start/close a lab or asks where the project left off.
- `skills-lock.json` at the repo root pins ~25 other general-purpose skills (Firebase, Supabase,
  Azure, shadcn, TDD, deploy-to-vercel, etc.) available in this Claude Code environment. None of
  them are specifically curated for this project's actual stack — most (Firebase/Supabase/Azure/
  shadcn) don't apply at all, since this project has no backend. Treat them as generally-available
  tools, not project conventions; `lab` is the one workflow this repo actually depends on.

## Development workflow: laboratórios (labs)

Implementation work is organized into **laboratórios** — small iterations, each a folder under
`labs/lab-NN-slug/` with a `FEATURES.md` (planned scope) and a `CONTEXT.md` (written at the end:
what was done, decisions made, and what the next lab should build — the handoff for resuming work
in a fresh session). `labs/CURRENT.md` always points at the active lab and is the first thing to
read when picking up this project cold. Templates are in `labs/_templates/`; full convention is
documented in `labs/README.md`.

Use the `lab` skill (`.claude/skills/lab/SKILL.md`) to start a new lab, wrap up the current one
(generating its `CONTEXT.md` from the actual git diff, not from memory), or check status — invoke
it whenever the user asks to start/close a lab or asks where the project left off.

Keep this file's build/test guidance and the "Contents"/"Skills" sections above current as the
project evolves — do not let them go stale relative to `README.md`/`labs/CURRENT.md`.
