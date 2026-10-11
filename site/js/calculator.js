/**
 * ROAMINGPIGS.AI — THE ANODIZED MODULAR INSTRUMENT WORKBENCH
 * Powers reactive meters, 2D error scopes, live oscillograms, Nixie readouts,
 * needle wattmeter deflection, and pull-out schematic drawers.
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. PULL-OUT SCHEMATIC DRAWERS
  // =========================================================================
  const drawerButtons = document.querySelectorAll('.drawer-toggle-btn');
  drawerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-drawer');
      const drawer = document.getElementById(targetId);
      if (!drawer) return;

      const isOpen = drawer.classList.contains('open');
      if (isOpen) {
        drawer.classList.remove('open');
        btn.classList.remove('is-active');
        btn.innerHTML = '<span>[PULL-OUT SCHEMATIC DRAWER &darr;]</span>';
      } else {
        drawer.classList.add('open');
        btn.classList.add('is-active');
        btn.innerHTML = '<span>[^ COLLAPSE SCHEMATIC DRAWER]</span>';
      }
    });
  });

  // =========================================================================
  // 2. BAY 01: TRCS ACOUSTIC CHANNEL ANALYZER
  // =========================================================================
  const codecButtons = document.querySelectorAll('.codec-btn');
  const oscWavePath = document.getElementById('oscWavePath');
  const oscFftPath = document.getElementById('oscFftPath');
  const codecSpecVal = document.getElementById('codecSpecVal');
  const codecWerVal = document.getElementById('codecWerVal');
  const codecFricativeVal = document.getElementById('codecFricativeVal');

  const CODEC_DATA = {
    'g711': {
      spec: '8 kHz, 8-bit log PCM (64 kbps)',
      wer: '18.2% ± 1.1% WER',
      fricative: '-14.2 dB (/s/ sibilance collapse)',
      wavePoints: 'M 0 90 Q 25 15, 50 90 T 100 90 T 150 90 T 200 90 T 250 90 T 300 90 T 350 90 T 400 90',
      fftPoints: 'M 0 170 L 40 40 L 80 80 L 120 120 L 160 165 L 200 170 L 400 170'
    },
    'amr': {
      spec: '8 kHz, ACELP vocoder (12.2 kbps)',
      wer: '24.6% ± 1.4% WER',
      fricative: '-21.8 dB (all-pole vowel smearing)',
      wavePoints: 'M 0 90 Q 30 35, 60 90 T 120 90 T 180 90 T 240 90 T 300 90 T 360 90 T 400 90',
      fftPoints: 'M 0 170 L 30 60 L 60 90 L 100 140 L 140 168 L 200 170 L 400 170'
    },
    'gsm': {
      spec: '8 kHz, RPE-LTP vocoder (13.0 kbps)',
      wer: '22.9% ± 1.3% WER',
      fricative: '-18.5 dB (pulse excitation plosive distortion)',
      wavePoints: 'M 0 90 Q 20 20, 45 90 T 90 90 T 135 90 T 180 90 T 225 90 T 270 90 T 315 90 T 400 90',
      fftPoints: 'M 0 170 L 35 50 L 70 85 L 110 135 L 150 166 L 200 170 L 400 170'
    }
  };

  codecButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      codecButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const c = btn.getAttribute('data-codec');
      const data = CODEC_DATA[c];
      if (data) {
        if (codecSpecVal) codecSpecVal.textContent = data.spec;
        if (codecWerVal) codecWerVal.textContent = data.wer;
        if (codecFricativeVal) codecFricativeVal.textContent = data.fricative;
        if (oscWavePath) oscWavePath.setAttribute('d', data.wavePoints);
        if (oscFftPath) oscFftPath.setAttribute('d', data.fftPoints);
      }
    });
  });

  // =========================================================================
  // 3. BAY 02: VEC-SCR VERIFIER COVARIANCE SCOPE
  // =========================================================================
  const riskButtons = document.querySelectorAll('.risk-btn');
  const scopeBoundaryLine = document.getElementById('scopeBoundaryLine');
  const scopeRiskStatus = document.getElementById('scopeRiskStatus');
  const scopeAbstainRate = document.getElementById('scopeAbstainRate');
  const scopeOverconf = document.getElementById('scopeOverconf');
  const stageSteps = document.querySelectorAll('.stopping-stage-step');

  riskButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      riskButtons.forEach(b => {
        b.classList.remove('active');
        b.classList.remove('risk-active');
      });
      const mode = btn.getAttribute('data-risk');
      if (mode === 'asymmetric') {
        btn.classList.add('risk-active');
        if (scopeBoundaryLine) {
          scopeBoundaryLine.setAttribute('x1', '60');
          scopeBoundaryLine.setAttribute('y1', '190');
          scopeBoundaryLine.setAttribute('x2', '200');
          scopeBoundaryLine.setAttribute('y2', '30');
          scopeBoundaryLine.setAttribute('stroke', '#ff3344');
        }
        if (scopeRiskStatus) scopeRiskStatus.textContent = 'C_FA >> C_FR (10:1 Penalty Ratio)';
        if (scopeAbstainRate) scopeAbstainRate.textContent = '95.7% Bayes Risk Reduction (τ = 0.70)';
        if (scopeOverconf) scopeOverconf.textContent = 'Corrected: 59.4% Posterior Log-Odds';
        
        // Highlight stage K*=3
        stageSteps.forEach((s, idx) => {
          s.classList.remove('active-step', 'terminal-stop');
          if (idx <= 2) s.classList.add('active-step');
          if (idx === 2) s.classList.add('terminal-stop');
        });
      } else {
        btn.classList.add('active');
        if (scopeBoundaryLine) {
          scopeBoundaryLine.setAttribute('x1', '30');
          scopeBoundaryLine.setAttribute('y1', '190');
          scopeBoundaryLine.setAttribute('x2', '190');
          scopeBoundaryLine.setAttribute('y2', '30');
          scopeBoundaryLine.setAttribute('stroke', '#00e5ff');
        }
        if (scopeRiskStatus) scopeRiskStatus.textContent = 'C_FA = C_FR (Symmetric Loss)';
        if (scopeAbstainRate) scopeAbstainRate.textContent = '0.0% (Forced Majority Decision)';
        if (scopeOverconf) scopeOverconf.textContent = 'Distorted: +2.68 nats (95.5% Inflated Odds)';

        stageSteps.forEach((s, idx) => {
          s.classList.remove('active-step', 'terminal-stop');
          if (idx === 0) s.classList.add('active-step', 'terminal-stop');
        });
      }
    });
  });

  // =========================================================================
  // 4. BAY 04 & BAY 05: SILICON THERMODYNAMICS & SIZING SIMULATOR
  // =========================================================================
  const modelSelect = document.getElementById('modelSelect');
  const quantSelect = document.getElementById('quantSelect');
  const contextSlider = document.getElementById('contextSlider');
  const contextVal = document.getElementById('contextVal');
  const hwSelect = document.getElementById('hwSelect');
  const tariffInput = document.getElementById('tariffInput');

  // Bay 05 Simulator Readouts
  const ramVal = document.getElementById('ramVal');
  const kvVal = document.getElementById('kvVal');
  const bwVal = document.getElementById('bwVal');
  const speedVal = document.getElementById('speedVal');
  const energyVal = document.getElementById('energyVal');
  const powerVal = document.getElementById('powerVal');
  const costElecVal = document.getElementById('costElecVal');
  const costTcoVal = document.getElementById('costTcoVal');
  const savingsVal = document.getElementById('savingsVal');

  // Bay 04 Hardware Telemetry Elements
  const wattmeterNeedle = document.getElementById('wattmeterNeedle');
  const wattmeterValLabel = document.getElementById('wattmeterValLabel');
  const nixieDigitReadout = document.getElementById('nixieDigitReadout');
  const rooflineBarFill = document.getElementById('rooflineBarFill');
  const rooflinePercent = document.getElementById('rooflinePercent');
  const rooflineBwLabel = document.getElementById('rooflineBwLabel');

  const MODELS = {
    '8b': { name: '8B Dense (32 layers, 4096 hidden)', params: 8.0, active: 8.0, layers: 32, hidden: 4096 },
    '14b': { name: '14B Dense (48 layers, 5120 hidden)', params: 14.0, active: 14.0, layers: 48, hidden: 5120 },
    '32b': { name: '32B Dense (64 layers, 5120 hidden)', params: 32.5, active: 32.5, layers: 64, hidden: 5120 },
    '70b': { name: '70B Dense (80 layers, 8192 hidden)', params: 70.6, active: 70.6, layers: 80, hidden: 8192 },
    'moe_30b': { name: '30B MoE (48 layers, 3.3B active weights)', params: 30.0, active: 3.3, layers: 48, hidden: 2048 }
  };

  const QUANTS = {
    'fp16': { name: 'FP16 (16.0 bits/weight — Uncompressed)', bits: 16.0 },
    'q8_0': { name: 'Q8_0 (8.5 bits/weight — Near-Lossless)', bits: 8.5 },
    'q5_k_m': { name: 'Q5_K_M (5.5 bits/weight — High Fidelity)', bits: 5.5 },
    'q4_k_m': { name: 'Q4_K_M (4.8 bits/weight — Frontier Sweet Spot)', bits: 4.8 },
    'iq4_xs': { name: 'IQ4_XS (4.25 bits/weight — Compact Matrix)', bits: 4.25 }
  };

  const HARDWARE = {
    'unified_apu': {
      name: 'Unified Memory APU (256-bit LPDDR5X, 256 GB/s peak)',
      peakBw: 256.0,
      sustainedEff: 0.870,
      wallPowerActive: 108.4,
      idlePower: 15.0,
      capitalPerMtok: 0.65,
      dialMaxW: 300
    },
    'desktop_ddr5': {
      name: 'Desktop Dual-Channel DDR5 (128-bit DDR5-6000, 96 GB/s peak)',
      peakBw: 96.0,
      sustainedEff: 0.780,
      wallPowerActive: 175.0,
      idlePower: 45.0,
      capitalPerMtok: 1.20,
      dialMaxW: 300
    },
    'server_ddr5': {
      name: 'Server Multi-Channel DDR5 (8-Channel DDR5-4800, 307 GB/s peak)',
      peakBw: 307.2,
      sustainedEff: 0.810,
      wallPowerActive: 380.0,
      idlePower: 95.0,
      capitalPerMtok: 2.10,
      dialMaxW: 600
    },
    'discrete_hbm': {
      name: 'Datacenter HBM Accelerator (80GB HBM3, 3,350 GB/s peak, slot share)',
      peakBw: 3350.0,
      sustainedEff: 0.720,
      wallPowerActive: 1050.0,
      idlePower: 250.0,
      capitalPerMtok: 9.50,
      dialMaxW: 1200
    }
  };

  function updateSimulator() {
    if (!modelSelect || !quantSelect || !hwSelect || !contextSlider) return;

    const m = MODELS[modelSelect.value];
    const q = QUANTS[quantSelect.value];
    const hw = HARDWARE[hwSelect.value];
    const contextLen = parseInt(contextSlider.value, 10);
    const tariff = parseFloat(tariffInput.value) || 0.14;

    if (contextVal) {
      contextVal.textContent = contextLen.toLocaleString() + ' tokens';
    }

    // 1. Model weights size in RAM (GB)
    const weightGb = (m.params * q.bits) / 8.0;
    const activeWeightGb = (m.active * q.bits) / 8.0;

    // 2. KV-cache size in RAM
    const bytesPerKvElem = contextLen > 8192 ? 1 : 2;
    const kvGb = (2 * m.layers * m.hidden * contextLen * bytesPerKvElem) / 1e9;
    const totalRamGb = weightGb + kvGb;

    // 3. Memory bandwidth saturation
    const sustainedBw = hw.peakBw * hw.sustainedEff;
    const busSaturationPct = hw.sustainedEff * 100.0;

    // 4. Generation Speed (tokens/sec) = sustainedBw / activeBytesPerToken
    let tokPerSec = sustainedBw / (activeWeightGb + (kvGb * 0.05));
    if (hwSelect.value === 'unified_apu') {
      if (modelSelect.value === 'moe_30b') tokPerSec = 65.3;
      else if (tokPerSec > 160) tokPerSec = 160;
    }
    if (hwSelect.value === 'desktop_ddr5' && tokPerSec > 60) tokPerSec = 60;

    // 5. Energy per token (Joules / token) = Wall Power (Watts) / (tok/s)
    const joulesPerTok = hw.wallPowerActive / tokPerSec;

    // 6. Electricity cost per 1M tokens ($/Mtok)
    const kwhPerMtok = (joulesPerTok * 1000000) / 3600000;
    const elecCostPerMtok = kwhPerMtok * tariff;

    // 7. Full amortized TCO ($/Mtok)
    const fullTcoPerMtok = elecCostPerMtok + hw.capitalPerMtok;

    // Baseline commercial API reference ($15.00/Mtok frontier token rate)
    const cloudSavingsPct = Math.max(0, ((15.00 - fullTcoPerMtok) / 15.00) * 100.0);

    // Update Bay 05 DOM Readouts
    if (ramVal) ramVal.textContent = totalRamGb.toFixed(1) + ' GB';
    if (kvVal) kvVal.textContent = kvGb.toFixed(2) + ' GB';
    if (bwVal) bwVal.textContent = sustainedBw.toFixed(1) + ' GB/s';
    if (speedVal) speedVal.textContent = tokPerSec.toFixed(1) + ' tok/s';
    if (energyVal) energyVal.textContent = joulesPerTok.toFixed(3) + ' J/tok';
    if (powerVal) powerVal.textContent = hw.wallPowerActive.toFixed(1) + ' W';
    if (costElecVal) costElecVal.textContent = '$' + elecCostPerMtok.toFixed(3) + ' / Mtok';
    if (costTcoVal) costTcoVal.textContent = '$' + fullTcoPerMtok.toFixed(3) + ' / Mtok';
    if (savingsVal) savingsVal.textContent = cloudSavingsPct.toFixed(1) + '% vs Commercial Cloud API';

    // Master coupling to Bay 04:
    // Update Needle Wattmeter
    if (wattmeterNeedle) {
      // Map wall power to dial deflection: 0W is -60 deg, maxW is +60 deg
      const maxW = hw.dialMaxW || 300;
      const clampedW = Math.min(Math.max(hw.wallPowerActive, 0), maxW);
      const angle = -60 + (clampedW / maxW) * 120;
      wattmeterNeedle.setAttribute('transform', `rotate(${angle.toFixed(1)}, 130, 130)`);
    }
    if (wattmeterValLabel) {
      wattmeterValLabel.textContent = hw.wallPowerActive.toFixed(0) + ' W';
    }

    // Update Nixie Tube Readout
    if (nixieDigitReadout) {
      nixieDigitReadout.textContent = joulesPerTok.toFixed(2) + ' J';
    }

    // Update Roofline Bar & Percent
    if (rooflineBarFill) {
      rooflineBarFill.style.width = busSaturationPct.toFixed(1) + '%';
    }
    if (rooflinePercent) {
      rooflinePercent.textContent = busSaturationPct.toFixed(1) + '%';
    }
    if (rooflineBwLabel) {
      rooflineBwLabel.textContent = sustainedBw.toFixed(1) + ' GB/s sustained';
    }
  }

  if (modelSelect) modelSelect.addEventListener('change', updateSimulator);
  if (quantSelect) quantSelect.addEventListener('change', updateSimulator);
  if (contextSlider) contextSlider.addEventListener('input', updateSimulator);
  if (hwSelect) hwSelect.addEventListener('change', updateSimulator);
  if (tariffInput) tariffInput.addEventListener('input', updateSimulator);

  // Initial calculation pass
  updateSimulator();
});
