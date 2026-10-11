# RoamingPigs AI Inference Engine & Hardware Telemetry

Official live telemetry engine and interactive inference physics calculator for **RoamingPigs AI** (`https://roamingpigs.ai`).

## Capabilities

1. **Interactive Client-Side Physics Calculator:**
   - Real-time memory footprint estimation (weights + attention KV-cache).
   - Sustained memory bus bandwidth saturation (256.0 GB/s peak on unified LPDDR5X vs. 3.35 TB/s H100).
   - Joules-per-token decode thermodynamics and physical wall-socket power draw.
   - Marginal electricity cost and amortized 3-year hardware TCO comparisons ($/Mtok).

2. **Progressive 4-Stage Storyboard Pipeline:**
   - Stage 1: Z-Image-Turbo 6B (8 steps, ~14s, 512x896) for rapid composition exploration.
   - Stage 2: FLUX.2 klein 9B (4 steps, cfg 1.0, Euler, ~32s) for facial and structural identity anchoring.
   - Stage 3: Qwen-Image-Edit-2511 20B (20 steps, cfg 2.5, flow-shift 3, ~75s) for textual and instruction editing.
   - Stage 4: RealESRGAN x4plus (~4.5s) to 1080x1920 or 4K production upscaling.

3. **Four-Tier AI Compute Continuum:**
   - Tier 1: Sovereign Warden APU (122.7 GB unified RAM, Vulkan, strictly $0.00 cloud spend).
   - Tier 2: Haywire Host (Dual Xeon 8160, 96 cores, 768 GB RAM, EBU R128 mastering, YuNet+SFace).
   - Tier 3: Edge API Platform (Ambie.ai Cloudflare Workers AI with 15 LLMs, Whisper Large v3, Llama 3.3 70B).
   - Tier 4: Vastops Spot GPU Fleet ($0.30–$1.50/hr, <$0.01/s video, eval-gated training).

## Deployment

Deployable via `cf-deploy.py roamingpigs.ai -y` to Cloudflare Pages project `roamingpigs-ai`.
