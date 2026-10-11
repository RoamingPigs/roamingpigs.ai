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
    '8b': { name: '8B Dense (Llama-3.1-8B / Qwen-2.5-7B)', params: 8.0, active: 8.0, layers: 32, hidden: 4096 },
    '14b': { name: '14B Dense (Qwen-2.5-14B)', params: 14.0, active: 14.0, layers: 48, hidden: 5120 },
    '30b_moe': { name: '30B MoE (Qwen3-VL:30b-a3b)', params: 30.0, active: 3.3, layers: 48, hidden: 2048 },
    '70b': { name: '70B Dense (Llama-3.3-70B)', params: 70.0, active: 70.0, layers: 80, hidden: 8192 },
    '122b': { name: '122B Dense (Qwen3.5:122b)', params: 122.0, active: 122.0, layers: 96, hidden: 10240 }
  };

  const QUANTS = {
    'fp16': { name: 'FP16 (Uncompressed)', bits: 16.0 },
    'q8_0': { name: 'Q8_0 (8-bit Quantized)', bits: 8.5 },
    'q4_k_m': { name: 'Q4_K_M (4-bit Medium)', bits: 4.8 },
    'iq4_xs': { name: 'IQ4_XS (4-bit Extra Small)', bits: 4.25 },
    'q3_k_m': { name: 'Q3_K_M (3-bit Medium)', bits: 3.4 }
  };

  const HARDWARE = {
    'apu': {
      name: 'Sovereign AMD APU (122.7GB Unified LPDDR5X)',
      peakBw: 256.0,
      sustainedEff: 0.870,
      wallPowerActive: 108.4,
      idlePower: 17.0,
      capitalPerMtok: 0.605
    },
    'h100': {
      name: 'Datacenter Node (8x H100 SXM5 Share)',
      peakBw: 3350.0,
      sustainedEff: 0.720,
      wallPowerActive: 1047.0, // per GPU share of 8378W grid draw
      idlePower: 250.0,
      capitalPerMtok: 9.250 // rental rate amortized
    }
  };

  function update() {
    const m = MODELS[modelSelect.value];
    const q = QUANTS[quantSelect.value];
    const hw = HARDWARE[hwSelect.value];
    const contextLen = parseInt(contextSlider.value, 10);
    const tariff = parseFloat(tariffInput.value) || 0.14;

    contextVal.textContent = contextLen.toLocaleString() + ' tokens';

    // 1. Model weights size in RAM
    const weightGb = (m.params * q.bits) / 8.0;
    const activeWeightGb = (m.active * q.bits) / 8.0;

    // 2. KV-cache size in RAM (2 * layers * hidden * context * 2 bytes / 1e9)
    // Using 8-bit quantized KV cache above 8k tokens
    const bytesPerKvElem = contextLen > 8192 ? 1 : 2;
    const kvGb = (2 * m.layers * m.hidden * contextLen * bytesPerKvElem) / 1e9;
    const totalRamGb = weightGb + kvGb;

    // 3. Memory bandwidth saturation
    const sustainedBw = hw.peakBw * hw.sustainedEff;
    const busSaturationPct = hw.sustainedEff * 100.0;

    // 4. Generation Speed (tokens/sec) = sustainedBw / activeWeightGb
    let tokPerSec = sustainedBw / (activeWeightGb + (kvGb * 0.05));
    // Physical saturation ceiling
    if (tokPerSec > 180) tokPerSec = 180;

    // 5. Energy per token (Joules / token) = Wall Power (Watts) / (tok/s)
    const joulesPerTok = hw.wallPowerActive / tokPerSec;

    // 6. Electricity cost per 1M tokens ($/Mtok)
    // 1 kWh = 3,600,000 Joules
    const kwhPerMtok = (joulesPerTok * 1000000) / 3600000;
    const elecCostPerMtok = kwhPerMtok * tariff;

    // 7. Full amortized TCO
    const fullTcoPerMtok = elecCostPerMtok + hw.capitalPerMtok;

    // Cloud frontier comparison ($15.00/Mtok standard API rate)
    const cloudSavingsPct = ((15.00 - fullTcoPerMtok) / 15.00) * 100.0;

    // Update DOM
    ramVal.textContent = totalRamGb.toFixed(1) + ' GB';
    kvVal.textContent = kvGb.toFixed(2) + ' GB';
    bwVal.textContent = sustainedBw.toFixed(1) + ' GB/s (' + busSaturationPct.toFixed(1) + '%)';
    speedVal.textContent = tokPerSec.toFixed(1) + ' tok/s';
    energyVal.textContent = joulesPerTok.toFixed(3) + ' J/tok';
    powerVal.textContent = hw.wallPowerActive.toFixed(0) + ' W';
    costElecVal.textContent = '$' + elecCostPerMtok.toFixed(3) + ' / Mtok';
    costTcoVal.textContent = '$' + fullTcoPerMtok.toFixed(3) + ' / Mtok';
    savingsVal.textContent = cloudSavingsPct.toFixed(1) + '% vs. Cloud API';
  }

  modelSelect.addEventListener('change', update);
  quantSelect.addEventListener('change', update);
  contextSlider.addEventListener('input', update);
  hwSelect.addEventListener('change', update);
  tariffInput.addEventListener('input', update);

  update();
});
