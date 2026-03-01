---
name: pa-canvas-screen
description: Generate a Power Apps canvas screen with controls, data bindings, and navigation
argument-hint: "<screen-type> [--data-source <name>] [--type list|detail|form|dashboard|settings]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Generate Canvas Screen

Generate a canvas app screen template with appropriate controls and Power Fx formulas.

## Instructions

1. Based on `--type`, generate a screen template:
   - `list`: Gallery with search, sort, and navigation to detail.
   - `detail`: Display form with edit button and back navigation.
   - `form`: Edit form with validation, submit, and cancel.
   - `dashboard`: KPI cards with charts and summary data.
   - `settings`: Toggle switches, dropdowns, and save button.
2. Include proper naming conventions (scr, gal, btn, txt, lbl prefixes).
3. Include Power Fx formulas for OnSelect, OnVisible, Items, and Default properties.
4. If `--data-source` is specified, bind controls to that data source.
5. Include error handling with IfError and Notify.
