# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repository currently contains no source code, build system, or tests — it holds a single planning document (`prompt.md`) that is a market-research/product-design brief for a children's educational game MVP. There is nothing to build, lint, or test yet.

## Contents

- `README.md` — one-line project title ("pesquisa" / "mvp").
- `prompt.md` — a structured Portuguese-language brief (market hypotheses, MVP scope, tech stack recommendations incl. a .NET/C# backend option, hosting plan, backlog priorities, monetization strategy, and an "operational prompt" at the end meant to be fed to a product-design AI session) for prototyping an educational game aimed at ~10-year-olds.
- `labs/` — the iteration workflow for implementation work (see below). Not yet populated with actual code — `labs/lab-01-fundacao/` currently only has a planned `FEATURES.md`.

## Working in this repo

- `prompt.md` is the source of truth for product direction. Section 13 ("Entregáveis esperados da prototipação") lists the deliverables expected from prototyping work: game proposal, lean GDD, technical architecture, sprint plan, and a Play-Store-free launch plan. Section 14 contains the exact operational prompt intended to drive that work. Section 15 covers the monetization strategy (parent-facing subscription, never gating educational content — modeled on Prodigy Math Game).
- If asked to start implementing the MVP described in `prompt.md`, treat the recommended stacks in Section 7 as defaults unless told otherwise: Option A (React + TypeScript + Vite, Phaser 3, Supabase) is the fast web/mobile path; Option B (PlayCanvas/Babylon.js + Firebase) is the lightweight-3D alternative; Option C swaps the backend for ASP.NET Core/C# on Azure Functions (Static Web Apps free tier + Azure SignalR free tier) while keeping the same frontend — pick it when the person implementing needs to read/review the backend code themselves. Section 8 covers free-tier hosting choices, Section 11 lists mandatory child-safety/compliance constraints (no open chat, language filtering, guardian consent, data minimization) that apply to any implementation.

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

- When code is eventually added, keep this file's build/lint/test guidance current — do not leave it stale.
