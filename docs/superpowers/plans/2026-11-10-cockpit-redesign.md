# Cockpit Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make both cockpit views a readable, functional airliner flight deck.

**Architecture:** Aircraft meshes own geometry and clickable parts. Separate render modules own cockpit materials/lighting and Canvas avionics. The main game supplies real state, flight context, and persisted user settings.

**Tech Stack:** Existing Three.js, JavaScript, Canvas 2D, Node test runner and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-cockpit-redesign.md`

- [x] Rebuild the interior geometry, instrument bezels and moving controls while preserving their actions.
- [x] Implement live avionics, finish materials and responsive cockpit lighting in separate modules.
- [x] Connect real flight data, physical cockpit inputs, accessible camera controls and better seat framing.
- [x] Test the live deck in day, night and mobile views, verify the existing game, and rebuild the standalone HTML.
