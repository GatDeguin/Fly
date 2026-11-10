# Landing Academy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the existing Solana approach into a repeatable challenge with a measurable result.

**Architecture:** The fixed-step simulation exposes contact telemetry before ground correction. The academy scores it independently; the browser integrates the challenge lifecycle, persistence and HUD.

**Tech Stack:** Existing JavaScript, Three.js, Node test runner and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-landing-academy-design.md`

## Global Constraints

- Keep the HTML self-contained and free flight as the default.
- Preserve existing controls and pairing. The HUD must fit desktop and phone viewports.
- Store only bounded scores in local browser preferences and preserve the prior free flight on exit.

## Tasks

- [x] Write failing coverage, then implement the three starts, approach guidance and scoring against actual Solana contact telemetry in `src/academy.js` and `src/simulation.js`.
- [x] Implement the Flight panel entries, compact HUD and debrief in `src/ui.js` and `src/shell.html`; add batched runway lighting in `src/world.js`.
- [x] Verify the old bundle fails the academy browser test; wire start, retry, exit and saved personal bests in `src/main.js`.
- [x] Generate `SkyJourney.ico`, verify its Windows sizes, and embed it in the offline HTML.
- [x] Rebuild `index.html`, run the full Node suite and Playwright desktop/mobile flows, inspect screenshots and review the candidate diff.
