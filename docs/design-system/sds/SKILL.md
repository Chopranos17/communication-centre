---
name: sds
description: Apply Sapien Design System (SDS) patterns when building UI components, designing frontend interfaces, or reviewing code for design consistency. Use this skill whenever the user asks to build a component, page, form, dashboard, or any UI element that should follow SDS — even if they don't explicitly say "SDS". Also use when asked to review or fix styling issues in an existing frontend project. Triggers on words like "component", "button", "card", "modal", "form", "tabs", "input", "design system", "UI", or "frontend" — especially when the user is working on a Sapien/SDS project.
---

# Sapien Design System (SDS) — Skill Index

This skill is organized into the following modules. Read the relevant module(s) before generating code or advising on design decisions.

## Modules

| Module | File | Covers |
|--------|------|--------|
| **Tokens** | `tokens/TOKENS.md` | Colors, Typography, Spacing, Radius, Shadows, Breakpoints, Animation |
| **Layout** | `layout/LAYOUT.md` | Page background, Grid system, Desktop/Mobile layout specs, Page structure patterns |
| **Components** | `components/COMPONENTS.md` | All UI components: Button, Input, Card, Modal, Tabs, Table, Avatar, etc. |
| **Iconography** | `iconography/ICONOGRAPHY.md` | Icon style rules, sizes, color usage |

## Quick Reference — What NOT to use

| ❌ Don't use        | ✅ Use instead             |
|--------------------|----------------------------|
| `rounded-lg/xl/2xl` | `rounded-sds-8/12/16`    |
| `shadow-sm/md/lg`   | `shadow-sds-1/2/3`       |
| `text-sm/base/xl`   | `text-body-s/m/l`        |
| `text-gray-500`     | `text-[#4d4d4d]`         |
| `border-gray-200`   | `border-[#e0e0e0]`       |
| `bg-blue-500`       | `bg-[#0183FF]`           |
| `font-sans`         | `font-darwin`            |
| `text-gray-900`     | `text-[#131313]`         |
