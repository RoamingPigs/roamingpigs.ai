# Work Tracker, roamingpigs.ai

Durable backlog. Update at every milestone and pause.

**Updated:** 2026-10-11

## Done

- [x] 2026-10-11: Rebuilt as "Instruments". Withdrew the hardware-rack design and its unsourced telemetry (agent-swarm counts, a verifier correlation that matched no statistic, a 1.66 J/token headline from dividing an assumed power by an assumed speed). Two instruments: inference cost calculator and codec grid explorer.
- [x] Calculator model fixed and validated: KV cache weight 1.0 (was 0.05), KV size from kv_heads (was hidden size, 2 to 8x too big), speed computed (was hard-coded), batch-1 comparison stated, API reference price added. 12 unit tests plus a 400-case Python cross-check; validation table against metered and published speeds on the method page.
- [x] Gates green on 5 pages x 3 viewports (axe WCAG 2.2 AA, overflow, console and CSP), plus scripted interaction tests of both instruments; SEO audit 9 of 9; copy audit clean; pre-deploy clean.

- [x] 2026-10-12: Codec grid explorer rebuilt on the full run (5,760 transcripts, 40 calls, call selector, corpus error per cell). The pilot data file is removed.
- [x] `build.py --check` is in `pre_build` for this site and the Abundera-only `well-known` SEO dimension is skipped.

## Open

- [ ] **Cloudflare Web Analytics** auto-injection: see the roamingpigs.org tracker. Operator action.
- [ ] **Measure another machine.** Only the unified-memory machine has meter readings. Desktop, server and GPU efficiency and power are assumptions, labelled as such.
- [ ] **Re-run the 125B mixture energy test.** Its recorded speed implies 356 GB/s on a 256 GB/s bus, so it is excluded.
- [ ] **Model batching** (throughput and energy per token against batch size) so the data-centre comparison can be fair. Needs a source or a measurement.
- [ ] Add prompt-processing (prefill) estimates. Currently not modelled.
- [ ] An explorer for the gate results (energy against neural VAD, with the speech cost), once real recorded audio exists to test them on.
- [ ] **Old unlinked files at the edge** (see the roamingpigs.org tracker): `/js/calculator.js`, `/css/style.css` and `/data/e2-grid.json` from the retired design are still served from cache and should expire by about 18 October.
