# Work Tracker — roamingpigs.ai

Durable backlog. Update at every milestone/pause (WORK-TRACKER-STANDARD).

**Updated:** 2026-10-11 (Pacific)

## Done

- [x] 2026-10-11 — **Launch of The Anodized Modular Instrument Workbench.** Rebuilt `roamingpigs.ai` from the ground up as a physical 19-inch dark anodized slate (`#12151b`) laboratory hardware rack. Features 5 discrete instrument bays with zero-radius machined bezels and expandable pull-out telemetry drawers (`[PULL-OUT SCHEMATIC DRAWER ↓]`):
  1. *Bay 01 (TRCS Acoustic Channel Analyzer):* Live audio waveform oscillograms, interactive codec selectors (G.711, AMR-NB, GSM-FR), squelch noise gate status, and expandable drawer with full ITU-T G.712 data tables ($n=1,050$).
  2. *Bay 02 (VEC-SCR Verifier Covariance Scope):* 2D decision error scope ($\rho=0.42 \pm 0.04$), asymmetric risk penalty toggle ($C_{\text{FA}} \gg C_{\text{FR}}$), optimal Neyman-Pearson stopping boundary ($K^*=3$), and calibration ledgers.
  3. *Bay 03 (Echo Swarm PRG Gate Array):* Concurrency logic analyzer displaying 10 active agents, 12,400 advisory file holds, 0.00% lock collisions, and $\text{pass}^5 = 84.7\% \pm 1.6\%$ consistency.
  4. *Bay 04 (Silicon Thermodynamics & Roofline):* Functional SVG analog needle wattmeter deflecting to 108 W, glowing amber Nixie readout displaying calibrated `1.66 J/tok` for the 30B MoE tier at 65.3 tok/s, and 256-bit unified APU memory bus at 87.0% saturation (222.7 GB/s sustained).
  5. *Bay 05 (Master Calibration Bay):* Reactive hardware sizing simulator driving Bay 04 wattmeter needle deflection and full 3-year TCO economics in real time.
  - Zero LLM smell (verified via `llm-smell-audit.py`), clean git working tree, and deployed to Cloudflare Pages (`https://roamingpigs.ai/`).

## Open / Backlog

- [ ] **Procedural Web Audio acoustic filtering:** Optional in-browser real-time audio playback through 3.4 kHz Butterworth bandpass filter using Web Audio API on synthetic voice clips.
- [ ] **Hardware APU live telemetry webhook:** Connect local Warden APU `hwmon5` daemon for optional live telemetry streaming when APU is active.
