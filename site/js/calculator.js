document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('modelSelect');
  const quantSelect = document.getElementById('quantSelect');
  const contextSlider = document.getElementById('contextSlider');
  const contextVal = document.getElementById('contextVal');
  const hwSelect = document.getElementById('hwSelect');
  const tariffInput = document.getElementById('tariffInput');

  // Outputs
  const ramVal = document.getElementById('ramVal');
  const kvVal = document.getElementById('kvVal');
  const bwVal = document.getElementById('bwVal');
  const speedVal = document.getElementById('speedVal');
  const energyVal = document.getElementById('energyVal');
  const powerVal = document.getElementById('powerVal');
  const costElecVal = document.getElementById('costElecVal');
  const costTcoVal = document.getElementById('costTcoVal');
  const savingsVal = document.getElementById('savingsVal');

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
      name: 'Unified Memory APU / SoC (256-bit LPDDR5X, 256 GB/s peak)',
      peakBw: 256.0,
      sustainedEff: 0.870,
      wallPowerActive: 108.0,
      idlePower: 15.0,
      capitalPerMtok: 0.65
    },
    'desktop_ddr5': {
      name: 'Desktop Dual-Channel DDR5 (128-bit DDR5-6000, 96 GB/s peak)',
      peakBw: 96.0,
      sustainedEff: 0.780,
      wallPowerActive: 175.0,
      idlePower: 45.0,
      capitalPerMtok: 1.20
    },
    'server_ddr5': {
      name: 'Server Multi-Channel DDR5 (8-Channel DDR5-4800, 307 GB/s peak)',
      peakBw: 307.2,
      sustainedEff: 0.810,
      wallPowerActive: 380.0,
      idlePower: 95.0,
      capitalPerMtok: 2.10
    },
    'discrete_hbm': {
      name: 'Datacenter HBM Accelerator (80GB HBM3, 3,350 GB/s peak, node share)',
      peakBw: 3350.0,
      sustainedEff: 0.720,
      wallPowerActive: 1050.0,
      idlePower: 250.0,
      capitalPerMtok: 9.50
    }
  };

  function update() {
    const m = MODELS[modelSelect.value];
    const q = QUANTS[quantSelect.value];
    const hw = HARDWARE[hwSelect.value];
    const contextLen = parseInt(contextSlider.value, 10);
    const tariff = parseFloat(tariffInput.value) || 0.14;

    contextVal.textContent = contextLen.toLocaleString() + ' tokens';

    // 1. Model weights size in RAM (GB)
    const weightGb = (m.params * q.bits) / 8.0;
    const activeWeightGb = (m.active * q.bits) / 8.0;

    // 2. KV-cache size in RAM (2 * layers * hidden * context * bytesPerElem / 1e9)
    // 8-bit quantized KV cache above 8k tokens
    const bytesPerKvElem = contextLen > 8192 ? 1 : 2;
    const kvGb = (2 * m.layers * m.hidden * contextLen * bytesPerKvElem) / 1e9;
    const totalRamGb = weightGb + kvGb;

    // 3. Memory bandwidth saturation
    const sustainedBw = hw.peakBw * hw.sustainedEff;
    const busSaturationPct = hw.sustainedEff * 100.0;

    // 4. Generation Speed (tokens/sec) = sustainedBw / activeBytesPerToken
    let tokPerSec = sustainedBw / (activeWeightGb + (kvGb * 0.05));
    // Physical saturation ceiling per hardware class
    if (hwSelect.value === 'unified_apu' && tokPerSec > 160) tokPerSec = 160;
    if (hwSelect.value === 'desktop_ddr5' && tokPerSec > 60) tokPerSec = 60;

    // 5. Energy per token (Joules / token) = Wall Power (Watts) / (tok/s)
    const joulesPerTok = hw.wallPowerActive / tokPerSec;

    // 6. Electricity cost per 1M tokens ($/Mtok)
    // 1 kWh = 3,600,000 Joules
    const kwhPerMtok = (joulesPerTok * 1000000) / 3600000;
    const elecCostPerMtok = kwhPerMtok * tariff;

    // 7. Full amortized TCO ($/Mtok)
    const fullTcoPerMtok = elecCostPerMtok + hw.capitalPerMtok;

    // Baseline commercial API reference ($15.00/Mtok frontier token rate)
    const cloudSavingsPct = Math.max(0, ((15.00 - fullTcoPerMtok) / 15.00) * 100.0);

    // Update DOM
    ramVal.textContent = totalRamGb.toFixed(1) + ' GB';
    kvVal.textContent = kvGb.toFixed(2) + ' GB';
    bwVal.textContent = sustainedBw.toFixed(1) + ' GB/s (' + busSaturationPct.toFixed(1) + '%)';
    speedVal.textContent = tokPerSec.toFixed(1) + ' tok/s';
    energyVal.textContent = joulesPerTok.toFixed(3) + ' J/tok';
    powerVal.textContent = hw.wallPowerActive.toFixed(0) + ' W';
    costElecVal.textContent = '$' + elecCostPerMtok.toFixed(3) + ' / Mtok';
    costTcoVal.textContent = '$' + fullTcoPerMtok.toFixed(3) + ' / Mtok';
    savingsVal.textContent = cloudSavingsPct.toFixed(1) + '% vs. Commercial Cloud API';
  }

  modelSelect.addEventListener('change', update);
  quantSelect.addEventListener('change', update);
  contextSlider.addEventListener('input', update);
  hwSelect.addEventListener('change', update);
  tariffInput.addEventListener('input', update);

  update();
});
