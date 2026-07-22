# DRISHTI — Design System ("Case File Cabinet")

## Why this direction
An investigator's actual visual world — case folders, evidence tags,
teleprinter case numbers — gives more distinctive material than a generic
dashboard reskin. This system is built from that, not from a default
SaaS palette.

## Tokens (see `src/styles/variables.css`)
- **Surface**: ops-room dark — `--color-bg` (#0d1117), `--color-surface`
  (#161b22), `--color-surface-raised` (#1f2630). No shadows, no gradients;
  hairline borders only (`--color-border` #2a313c).
- **Accent**: `--color-accent` (#f0a202, evidence-tag amber) for primary
  actions and the active nav tab. `--color-flag` (#e4572e, case-flag red)
  is reserved for hotspots/critical states only — never both accents on
  one element.
- **Type**: `--font-display` (Barlow Condensed) for headers/nav —
  condensed, government-form character. `--font-body` (Inter) for prose/
  UI copy. `--font-mono` (IBM Plex Mono) for anything that IS data — case
  numbers, coordinates, timestamps — via the global `.mono` class.

## Signature element: folder-tab navigation
Each tab in `Dashboard.jsx` is a trapezoid (CSS `clip-path`) sitting in a
darker "cabinet strip." The active tab is taller and lighter, visually
pulling forward and fusing with the panel below — like pulling a case
file to the front of a drawer. This replaces generic pill-button nav and
is the one deliberate risk in this system; everything else stays quiet
and disciplined around it.

## Applying this to new components
- Reach for `--font-mono` + `.mono` for IDs, coordinates, dates — anything
  that would appear on an actual case file.
- Reach for `--font-display` for section headers/labels, uppercase with
  letter-spacing, matching the tab strip.
- Body copy and descriptions stay in `--font-body`, sentence case.
- Amber for interactive/primary; flag-red only for danger/hotspot
  emphasis — don't reach for red as a second general accent.
