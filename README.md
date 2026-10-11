# RoamingPigs Instruments (roamingpigs.ai)

Calculators and explorers that show their assumptions. Two instruments today:

- **Inference cost calculator** (`/inference-cost/`): memory, decode speed, energy per token and cost per million tokens for a model on a given machine. Batch size one. Validated against wall-meter runs on one unified-memory machine only.
- **Codec grid explorer** (`/codec-grid/`): 900 real transcripts from six open speech models through six audio paths and five noise levels, with a word-level diff of what was said against what the model wrote.

The research record (dated figures, samples, limits, corrections) is on roamingpigs.org. Papers are on ciscocaceres.com. Nothing is repeated across the three.

## How it is built

```bash
python3 scripts/build.py           # tests, then render site/
python3 scripts/build.py --check   # fail if canon or the rendered output is stale
```

- **One formula, written once.** `site/js/model.js` is the only implementation. The build runs `tests/model.test.mjs` and `tests/cross-check.py` (an independent Python implementation, 400 random inputs, must agree to 1e-9) and refuses to build otherwise. The home-page preview numbers are computed by running `model.js` under node at build time.
- **Constants with sources.** `data/model.json` holds every constant with its source and date, marks each as measured or assumed, and is served to the browser. The method page renders from it. The build asserts that the expected-fraction ranges cover every row of the validation table, so the range cannot drift from the evidence.
- **Measured data** (`data/canon.json`, `site/data/e2-grid.json`) comes from the research ledgers via `siteops/scripts/rp-canon.py`. Metered runs that imply more memory traffic than the bus can carry are excluded and the method page says so.
- **CSP is strict**: no inline script, style or handlers. The UI builds DOM with `textContent` only. Fonts are self-hosted and OFL (Geist, Geist Mono). The page URL hash holds the calculator state, validated on read.

## Gates before a deploy

```bash
python3 scripts/build.py --check
python3 ~/projects/siteops/scripts/seo-audit.py --domain roamingpigs.ai --mode static
python3 ~/projects/siteops/scripts/llm-smell-audit.py --root site --auto --max-em-dashes 1
~/projects/siteops/scripts/rp-shoot.sh site /tmp/shots / /inference-cost/ /codec-grid/ /method/
```

Deploy: `cf-deploy.py roamingpigs.ai -y` (Pages project `roamingpigs-ai`). Never `wrangler`.

## Rules for editing

- Every default needs a source and a date in `data/model.json`, or it is marked assumed.
- An output is "modelled". Only a reading is "measured".
- Say what the instrument does not model. Batching is the big one.
- Models appear by size and kind, never by product name.
