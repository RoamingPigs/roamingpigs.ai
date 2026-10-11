/* RoamingPigs inference model. Pure functions, no DOM. Loaded by the calculator and by the tests.
 *
 *   tokens_per_s_ceiling = efficiency * peak_bandwidth / (active_weights_GB + kv_cache_GB)
 *
 * Batch size is 1. Decode reads every active weight and the whole KV cache once per token. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RPModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SECONDS_PER_YEAR = 365.25 * 24 * 3600;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    throw new Error("unknown id: " + id);
  }

  /* inputs: { model, quant, context, hardware, kvBytes, tariff, duty, api, efficiency?, powerW?, priceUsd?, rentUsdPerHour?, lifeYears? }
     data: parsed data/model.json */
  function compute(data, inp) {
    var m = byId(data.models, inp.model);
    var q = byId(data.quants, inp.quant);
    var h = byId(data.hardware, inp.hardware);
    var kvBytes = inp.kvBytes || data.defaults.kv_bytes;

    var weightsGB = (m.total_b * q.bpw) / 8;
    var activeGB = (m.active_b * q.bpw) / 8;
    var kvGB = (2 * m.layers * m.kv_heads * m.head_dim * inp.context * kvBytes) / 1e9;
    var overheadGB = data.overhead_gb.value;
    var neededGB = weightsGB + kvGB + overheadGB;
    var fits = neededGB <= h.capacity_gb;

    var eff = inp.efficiency != null ? inp.efficiency : h.efficiency.value;
    var readGB = activeGB + kvGB;
    var ceiling = (eff * h.peak_gbps) / readGB;

    var f = data.expected_fraction_of_ceiling[m.kind];
    var tokLow = ceiling * f.low;
    var tokHigh = ceiling * f.high;

    var powerW = inp.powerW != null ? inp.powerW : h.power_w[m.kind];
    var jLow = powerW / tokHigh;
    var jHigh = powerW / tokLow;

    var tariff = inp.tariff;
    var tokMid = (tokLow + tokHigh) / 2;
    // electricity: kW * $/kWh * hours per million tokens
    function elec(tok) { return ((powerW / 1000) * tariff * 1e6) / (tok * 3600); }

    var duty = Math.max(0.01, Math.min(1, inp.duty));
    var capex, capexNote;
    if (h.cost.mode === "rent") {
      var rate = inp.rentUsdPerHour != null ? inp.rentUsdPerHour : h.cost.usd_per_hour;
      capex = function (tok) { return rate / (tok * 3600) * 1e6; };
      capexNote = "rented at $" + rate.toFixed(2) + " per hour";
    } else {
      var price = inp.priceUsd != null ? inp.priceUsd : h.cost.price_usd;
      var life = inp.lifeYears != null ? inp.lifeYears : h.cost.life_years;
      capex = function (tok, d) { return price / (tok * (d == null ? duty : d) * life * SECONDS_PER_YEAR) * 1e6; };
      capexNote = "$" + price.toLocaleString("en-US") + " over " + life + " years at " + Math.round(duty * 100) + "% duty";
    }
    function total(tok, d) {
      var c = h.cost.mode === "rent" ? capex(tok) : capex(tok, d);
      return elec(tok) + c;
    }

    return {
      model: m, quant: q, hardware: h,
      weightsGB: weightsGB, activeGB: activeGB, kvGB: kvGB, overheadGB: overheadGB,
      neededGB: neededGB, capacityGB: h.capacity_gb, fits: fits,
      readGB: readGB, efficiency: eff, ceiling: ceiling,
      tokLow: tokLow, tokHigh: tokHigh, tokMid: tokMid,
      powerW: powerW, jLow: jLow, jHigh: jHigh,
      elecLow: elec(tokHigh), elecHigh: elec(tokLow), elecMid: elec(tokMid),
      totalMid: total(tokMid), totalLow: total(tokHigh), totalHigh: total(tokLow),
      totalMidQuarterDuty: h.cost.mode === "rent" ? total(tokMid) : total(tokMid, 0.25),
      capexNote: capexNote, duty: duty,
      api: inp.api,
      calibrationReferenceAvailable: !!h.calibration_reference_available
    };
  }

  /* Share state in the URL hash, e.g. #m=m30&q=q4_k_m&c=16384&h=apu */
  function encode(inp) {
    var p = new URLSearchParams();
    p.set("m", inp.model); p.set("q", inp.quant); p.set("c", String(inp.context)); p.set("h", inp.hardware);
    p.set("t", String(inp.tariff)); p.set("d", String(Math.round(inp.duty * 100))); p.set("a", String(inp.api));
    return p.toString();
  }
  function decode(str, data) {
    var p = new URLSearchParams(str.replace(/^#/, ""));
    var d = data.defaults;
    function pick(list, v, fallback) { return list.some(function (x) { return x.id === v; }) ? v : fallback; }
    function num(v, lo, hi, fb) { var n = parseFloat(v); return isFinite(n) && n >= lo && n <= hi ? n : fb; }
    return {
      model: pick(data.models, p.get("m"), d.model),
      quant: pick(data.quants, p.get("q"), d.quant),
      hardware: pick(data.hardware, p.get("h"), d.hardware),
      context: num(p.get("c"), 512, 1048576, d.context),
      tariff: num(p.get("t"), 0.01, 2, d.tariff_usd_per_kwh),
      duty: num(p.get("d"), 1, 100, d.duty_pct) / 100,
      api: num(p.get("a"), 0, 1000, d.api_usd_per_mtok),
      kvBytes: d.kv_bytes
    };
  }

  return { compute: compute, encode: encode, decode: decode, byId: byId };
});
