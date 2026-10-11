/* Inference cost calculator UI. The maths is in model.js. No innerHTML, no inline styles in markup. */
(function () {
  "use strict";
  var M = window.RPModel;
  var root = document.getElementById("calc");
  if (!M || !root) return;

  var CTX = [2048, 4096, 8192, 16384, 32768, 65536, 131072];
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function money(v) {
    if (!isFinite(v)) return "n/a";
    if (v < 0.01) return "$" + v.toFixed(4);
    if (v < 100) return "$" + v.toFixed(2);
    return "$" + Math.round(v).toLocaleString("en-US");
  }
  function num(v, d) { return v.toFixed(d); }
  function range(lo, hi, d) { var a = num(lo, d), b = num(hi, d); return a === b ? a : a + "–" + b; }
  function ctxLabel(n) { return n >= 1024 ? (n / 1024) + "k" : String(n); }

  fetch(root.getAttribute("data-model"))
    .then(function (r) { return r.json(); })
    .then(init)
    .catch(function () {
      var p = el("p", { "class": "banner bad" }, "The calculator data failed to load. Reload the page, or use the method page to work it by hand.");
      root.insertBefore(p, root.firstChild);
    });

  function init(data) {
    var st = M.decode(location.hash, data);
    var ov = { eff: null, pow: null, cost: null };

    $("controls").addEventListener("submit", function (e) { e.preventDefault(); });

    // machine radios
    var segHw = $("seg-hw");
    data.hardware.forEach(function (h) {
      var id = "hw-" + h.id;
      var inp = el("input", { type: "radio", name: "hw", id: id, value: h.id });
      segHw.appendChild(inp); segHw.appendChild(el("label", { "for": id }, h.label));
    });
    // model select
    var selModel = $("sel-model");
    data.models.forEach(function (m) { selModel.appendChild(el("option", { value: m.id }, m.label)); });
    // quant radios
    var segQ = $("seg-q");
    data.quants.forEach(function (q) {
      var id = "q-" + q.id;
      segQ.appendChild(el("input", { type: "radio", name: "q", id: id, value: q.id }));
      segQ.appendChild(el("label", { "for": id }, q.label));
    });
    // context ticks
    var ticks = $("ticks-ctx");
    CTX.forEach(function (c) { ticks.appendChild(el("span", null, ctxLabel(c))); });

    function ctxIndex(c) { var best = 0; CTX.forEach(function (v, i) { if (Math.abs(v - c) < Math.abs(CTX[best] - c)) best = i; }); return best; }

    function writeControls() {
      document.querySelectorAll('input[name="hw"]').forEach(function (r) { r.checked = r.value === st.hardware; });
      document.querySelectorAll('input[name="q"]').forEach(function (r) { r.checked = r.value === st.quant; });
      selModel.value = st.model;
      $("rng-ctx").value = String(ctxIndex(st.context));
      $("in-tariff").value = String(st.tariff);
      $("in-duty").value = String(Math.round(st.duty * 100));
      $("in-api").value = String(st.api);
    }

    function hwObj() { return M.byId(data.hardware, st.hardware); }
    function modelObj() { return M.byId(data.models, st.model); }

    function costDefault(h) { return h.cost.mode === "rent" ? h.cost.usd_per_hour : h.cost.price_usd; }

    function syncAdvanced() {
      var h = hwObj(), m = modelObj();
      $("in-eff").value = String(ov.eff != null ? ov.eff : h.efficiency.value);
      $("in-pow").value = String(ov.pow != null ? ov.pow : h.power_w[m.kind]);
      $("in-cost").value = String(ov.cost != null ? ov.cost : costDefault(h));
      $("lbl-cost").textContent = h.cost.mode === "rent" ? "Rental price, $ per hour" : "Machine price, $";
      $("tag-eff").textContent = ov.eff != null ? "edited" : h.efficiency.basis;
      $("tag-pow").textContent = ov.pow != null ? "edited" : h.power_w.basis;
      $("note-sources").textContent = "Efficiency: " + h.efficiency.source + ". Power: " + h.power_w.source + " Price: " + h.cost.source;
    }

    function inputs() {
      var h = hwObj();
      var x = { model: st.model, quant: st.quant, context: st.context, hardware: st.hardware, tariff: st.tariff, duty: st.duty, api: st.api, kvBytes: st.kvBytes };
      if (ov.eff != null) x.efficiency = ov.eff;
      if (ov.pow != null) x.powerW = ov.pow;
      if (ov.cost != null) { if (h.cost.mode === "rent") x.rentUsdPerHour = ov.cost; else x.priceUsd = ov.cost; }
      return x;
    }

    function setW(node, pct) { node.style.width = Math.max(0, Math.min(100, pct)) + "%"; }

    function render() {
      var r = M.compute(data, inputs());
      var h = r.hardware, m = r.model;

      $("hint-model").textContent = m.kind === "moe" ? "reads " + m.active_b + "B of " + m.total_b + "B" : "";
      $("hint-q").textContent = num(r.quant.bpw, 2) + " bits per weight";
      $("val-ctx").textContent = ctxLabel(st.context) + " tokens";
      $("val-duty").textContent = Math.round(st.duty * 100) + "%";

      // headline readouts
      var tokNode = $("o-tok"); clear(tokNode);
      tokNode.appendChild(document.createTextNode(range(r.tokLow, r.tokHigh, r.tokHigh < 10 ? 1 : 0)));
      tokNode.appendChild(el("small", null, "tok/s"));
      $("o-tok-sub").textContent = "ceiling " + num(r.ceiling, r.ceiling < 10 ? 1 : 0) + " tok/s at " + num(r.efficiency * h.peak_gbps, 0) + " GB/s";
      var jNode = $("o-j"); clear(jNode);
      jNode.appendChild(document.createTextNode(range(r.jLow, r.jHigh, 1)));
      jNode.appendChild(el("small", null, "J/token"));
      $("o-j-sub").textContent = num(r.powerW, 0) + " W at decode, whole " + (h.id === "h100" ? "board" : "machine");
      var cNode = $("o-cost"); clear(cNode);
      cNode.appendChild(document.createTextNode(money(r.totalMid)));
      cNode.appendChild(el("small", null, "per M tok"));
      $("o-cost-sub").textContent = "electricity " + money(r.elecMid) + " + hardware " + money(r.totalMid - r.elecMid) + " (" + r.capexNote + ")";

      // memory bar
      var bar = $("membar"); clear(bar);
      var span = Math.max(r.capacityGB, r.neededGB);
      [["w", r.weightsGB], ["kv", r.kvGB], ["oh", r.overheadGB]].forEach(function (p) {
        var s = el("span", { "class": p[0] }); setW(s, p[1] / span * 100); bar.appendChild(s);
      });
      bar.setAttribute("aria-label", "Memory: " + num(r.neededGB, 1) + " GB needed of " + num(r.capacityGB, 0) + " GB");
      var lg = $("memlegend"); clear(lg);
      [["w", "#8fb4ff", "Weights", r.weightsGB], ["kv", "#f2b45a", "KV cache", r.kvGB], ["oh", "#9aa4b5", "Overhead", r.overheadGB]].forEach(function (p) {
        var item = el("span"); var sw = el("i"); sw.style.background = p[1]; item.appendChild(sw); item.appendChild(document.createTextNode(p[2] + " " + num(p[3], 1) + " GB")); lg.appendChild(item);
      });
      lg.appendChild(el("span", null, "Capacity " + num(r.capacityGB, 0) + " GB"));

      var warn = $("warn-fit");
      if (!r.fits) { warn.hidden = false; warn.textContent = "Does not fit. This needs " + num(r.neededGB, 1) + " GB and the machine has " + num(r.capacityGB, 0) + " GB. Try a smaller model, a lower quantisation or a shorter context."; }
      else warn.hidden = true;
      var wa = $("warn-assumed");
      if (!r.validated) { wa.hidden = false; wa.textContent = "Efficiency and power for this machine are assumptions, not measurements. Only the unified-memory machine has been checked against meter readings."; }
      else wa.hidden = true;

      // speed scale
      var sc = $("scale"); clear(sc);
      var max = r.ceiling * 1.12;
      var pos = function (v) { return (v / max * 100); };
      sc.appendChild(el("div", { "class": "axis" }));
      var band = el("div", { "class": "band" }); band.style.left = pos(r.tokLow) + "%"; band.style.width = Math.max(0.8, pos(r.tokHigh) - pos(r.tokLow)) + "%"; sc.appendChild(band);
      var tick = el("div", { "class": "tick" }); tick.style.left = pos(r.ceiling) + "%"; sc.appendChild(tick);
      var l1 = el("div", { "class": "lab" }, "expected " + range(r.tokLow, r.tokHigh, r.tokHigh < 10 ? 1 : 0)); l1.style.left = Math.max(12, Math.min(70, (pos(r.tokLow) + pos(r.tokHigh)) / 2)) + "%"; sc.appendChild(l1);
      var l2 = el("div", { "class": "lab" }, "ceiling " + num(r.ceiling, r.ceiling < 10 ? 1 : 0)); l2.style.left = Math.max(80, Math.min(94, pos(r.ceiling))) + "%"; sc.appendChild(l2);
      sc.setAttribute("aria-label", "Expected " + range(r.tokLow, r.tokHigh, 1) + " tokens per second, ceiling " + num(r.ceiling, 1));
      $("scale-note").textContent = "The band is the ceiling times " + data.expected_fraction_of_ceiling[m.kind].low + " to " + data.expected_fraction_of_ceiling[m.kind].high + ". " + data.expected_fraction_of_ceiling[m.kind].basis;

      // cost bars
      var cs = $("costs"); clear(cs);
      var top = Math.max(r.totalMid, r.api, r.elecMid) * 1.05 || 1;
      [["elec", "Electricity only", r.elecMid], ["hw", "Electricity + hardware", r.totalMid], ["api", "API, your price", r.api]].forEach(function (p) {
        var row = el("div", { "class": "cost-row " + (p[0] === "hw" ? "" : p[0]) });
        row.appendChild(el("span", { "class": "nm" }, p[1]));
        var tr = el("span", { "class": "track" }); var f = el("span", { "class": "fill" }); setW(f, p[2] / top * 100); tr.appendChild(f); row.appendChild(tr);
        row.appendChild(el("span", { "class": "val" }, money(p[2])));
        cs.appendChild(row);
      });
      var ratio = r.api > 0 ? r.totalMid / r.api : Infinity;
      var v = "At " + Math.round(st.duty * 100) + "% use, running it yourself costs about " + money(r.totalMid) + " per million tokens against " + money(r.api) + " from the API. ";
      if (r.api <= 0) v += "Set an API price to compare.";
      else if (ratio < 0.75) v += "That is below the API price.";
      else if (ratio <= 1.33) v += "That is about the same.";
      else v += "That is above the API price.";
      if (h.cost.mode === "own" && st.duty > 0.3) v += " At 25% use it would be " + money(r.totalMidQuarterDuty) + ".";
      v += " Electricity alone is " + money(r.elecMid) + ", so the rest is the machine.";
      $("verdict").textContent = v;

      $("refs-panel").hidden = st.hardware !== "apu";

      // mobile summary
      $("s-tok").textContent = range(r.tokLow, r.tokHigh, r.tokHigh < 10 ? 1 : 0);
      $("s-j").textContent = range(r.jLow, r.jHigh, 1);
      $("s-cost").textContent = money(r.totalMid);

      try { history.replaceState(null, "", "#" + M.encode(st)); } catch (e) { /* file or sandbox */ }
    }

    function onHw(v) { st.hardware = v; ov.eff = ov.pow = ov.cost = null; syncAdvanced(); render(); }
    segHw.addEventListener("change", function (e) { if (e.target.name === "hw") onHw(e.target.value); });
    segQ.addEventListener("change", function (e) { if (e.target.name === "q") { st.quant = e.target.value; render(); } });
    selModel.addEventListener("change", function () { st.model = selModel.value; ov.pow = null; syncAdvanced(); render(); });
    $("rng-ctx").addEventListener("input", function () { st.context = CTX[parseInt($("rng-ctx").value, 10)]; render(); });
    function numField(id, apply) {
      $(id).addEventListener("input", function () {
        var v = parseFloat($(id).value);
        if (isFinite(v) && v >= parseFloat($(id).min || "0")) { apply(v); render(); }
      });
    }
    numField("in-tariff", function (v) { st.tariff = v; });
    numField("in-api", function (v) { st.api = v; });
    $("in-duty").addEventListener("input", function () { st.duty = parseInt($("in-duty").value, 10) / 100; render(); });
    numField("in-eff", function (v) { if (v <= 1) { ov.eff = v; $("tag-eff").textContent = "edited"; } });
    numField("in-pow", function (v) { ov.pow = v; $("tag-pow").textContent = "edited"; });
    numField("in-cost", function (v) { ov.cost = v; });
    $("btn-reset").addEventListener("click", function () {
      ov.eff = ov.pow = ov.cost = null;
      var d = data.defaults; st.tariff = d.tariff_usd_per_kwh; st.duty = d.duty_pct / 100; st.api = d.api_usd_per_mtok;
      writeControls(); syncAdvanced(); render();
    });

    writeControls(); syncAdvanced(); render();
  }
})();
