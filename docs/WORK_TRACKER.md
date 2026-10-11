# Work Tracker, roamingpigs.ai

Durable backlog. Update at every milestone and pause.

**Updated:** 2026-10-11

## Done

- [x] 2026-10-11: Rebuilt as "Instruments". Withdrew the hardware-rack design and its unsourced telemetry (agent-swarm counts, a verifier correlation that matched no statistic, a 1.66 J/token headline from dividing an assumed power by an assumed speed). Two instruments: inference cost calculator and codec grid explorer.
- [x] Calculator model fixed and validated: KV cache weight 1.0 (was 0.05), KV size from kv_heads (was hidden size, 2 to 8x too big), speed computed (was hard-coded), batch-1 comparison stated, API reference price added. 12 unit tests plus a 400-case Python cross-check; validation table against metered and published speeds on the method page.
- [x] Gates green on 5 pages x 3 viewports (axe WCAG 2.2 AA, overflow, console and CSP), plus scripted interaction tests of both instruments; SEO audit 9 of 9; copy audit clean; pre-deploy clean.

## Open

- [ ] **Wire `python3 scripts/build.py --check` into `pre_build`** in `claude-code/config/cf-sites.json`.
- [ ] **Measure another machine.** Only the unified-memory machine has meter readings. Desktop, server and GPU efficiency and power are assumptions, labelled as such.
- [ ] **Re-run the 125B mixture energy test.** Its recorded speed implies 356 GB/s on a 256 GB/s bus, so either its speed or its active-parameter count is wrong. It is excluded until fixed.
- [ ] **Model batching** (throughput and energy per token versus batch size) so the data-centre comparison can be fair. Needs a source or a measurement.
- [ ] Add prompt-processing (prefill) estimates. Currently not modelled.
- [ ] **Live SEO audit `well-known` dimension** fails only on two Abundera-specific files (`abundera-capabilities.json`, an `llms.txt` redirect) that do not apply to this property. Add `"seo": {"skip": ["well-known"]}` for this site in `claude-code/config/cf-sites.json`. `gpc.json` is published.
- [ ] **Cloudflare Web Analytics auto-injection.** Cloudflare tries to inject its beacon on production. The site CSP blocks it (nothing loads, the privacy statement holds) but it logs a console error that costs a Lighthouse best-practices point. Either turn off automatic setup for this hostname, or accept the beacon in the CSP and change the "no analytics" line. Operator's call.


## Evidence correction — 11 October 2026 Pacific

Power/rate ratios now remain separate from reported integrated energy. Raw historical power arrays remain unavailable, and the bandwidth screen is an explicit model assumption. Efficiency defaults and source-fitted ranges are assumptions/calibration, not independent validation. The original Echo aggregate is separate from programmatic MAST annotations and allocated resources, whose export has explicit evidence metadata. The unused unsupported calculator asset was removed after script-reference and hash checks. Build, visual, publication and live verification remain pending for this correction.
