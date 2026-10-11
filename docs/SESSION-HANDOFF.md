# Session handoff, roamingpigs.ai

## Last session ended
2026-10-11

## Last big thing accomplished
Rebuilt the site as RoamingPigs Instruments: a dark, precise tool site with an inference cost calculator and a codec grid explorer that reads 900 real transcripts. The calculator formula lives once in `site/js/model.js`, checked by node tests and an independent Python implementation; constants and sources are in `data/model.json`.

## First action next session
Run `python3 scripts/build.py --check`. A stale canon means a ledger changed upstream.

## Read before editing
- The first design's numbers were unsourced; see roamingpigs.org `/corrections/`. Do not restore them.
- Change a constant only with a source and a date in `data/model.json`; the build checks the validation table against it.

## Open items
See `docs/WORK_TRACKER.md`.
