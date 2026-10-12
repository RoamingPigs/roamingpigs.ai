/* Codec grid explorer. Reads /data/e2v2-grid.json (the full run). No innerHTML. */
(function () {
  "use strict";
  var root = document.getElementById("grid");
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  var CODEC = { none: "Uncompressed 16 kHz", g711_mulaw: "G.711 µ-law", g711_alaw: "G.711 A-law", amr_nb: "AMR narrowband", gsm_fr: "GSM full-rate", opus_nb: "Opus narrowband" };
  function snrLabel(s) { return s === null ? "Clean" : (s < 0 ? "−" + Math.abs(s) : String(s)) + " dB"; }

  // colour ramp: 0 = green, 1.0 = amber, 1.6+ = coral. Numbers are always printed, so colour is never the only signal.
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  var G = [95, 224, 176], A = [242, 180, 90], C = [255, 138, 122];
  function colour(w) {
    var rgb = w <= 1 ? mix(G, A, Math.max(0, w)) : mix(A, C, Math.min(1, (w - 1) / 0.6));
    return "rgb(" + rgb.join(",") + ")";
  }

  fetch(root.getAttribute("data-src")).then(function (r) { return r.json(); }).then(init).catch(function () {
    root.insertBefore(el("p", { "class": "banner bad" }, "The transcript data failed to load. Reload the page."), root.firstChild);
  });

  function init(d) {
    var recs = d.records.map(function (r) { return { m: r[0], u: r[1], codec: r[2], snr: r[3], e: r[4], n: r[5], hyp: r[6] }; });
    var calls = Object.keys(d.utterances);
    var st = { model: -1, call: calls[0], cell: null, shown: 6 };

    $("ramp").style.background = "linear-gradient(90deg," + colour(0) + "," + colour(1) + "," + colour(1.6) + ")";

    var seg = $("seg-model");
    [{ v: -1, t: "All six" }].concat(d.models.map(function (p, i) { return { v: i, t: p }; })).forEach(function (o) {
      var id = "mdl-" + o.v;
      seg.appendChild(el("input", { type: "radio", name: "mdl", id: id, value: String(o.v) }));
      seg.appendChild(el("label", { "for": id }, o.t));
    });
    var sel = $("sel-utt");
    calls.forEach(function (u, i) { sel.appendChild(el("option", { value: u }, "Call " + (i + 1))); });

    function filtered() { return recs.filter(function (r) { return st.model < 0 || r.m === st.model; }); }
    function corpus(arr) {
      var e = 0, n = 0;
      arr.forEach(function (r) { e += r.e; n += r.n; });
      return n ? e / n : 0;
    }

    function drawHeat() {
      var t = $("heat"); clear(t);
      var head = el("thead"); var hr = el("tr"); hr.appendChild(el("th", { scope: "col" }, "Audio path"));
      d.snr_db.forEach(function (s) { hr.appendChild(el("th", { scope: "col" }, snrLabel(s))); });
      head.appendChild(hr); t.appendChild(head);
      var body = el("tbody"); var data = filtered();
      d.codecs.forEach(function (c) {
        var tr = el("tr"); tr.appendChild(el("th", { scope: "row" }, CODEC[c] || c));
        d.snr_db.forEach(function (s) {
          var cell = data.filter(function (r) { return r.codec === c && r.snr === s; });
          var w = corpus(cell);
          var pressed = !!(st.cell && st.cell.c === c && st.cell.s === s);
          var b = el("button", { type: "button", "class": "cell", "aria-pressed": pressed ? "true" : "false", "aria-label": (CODEC[c] || c) + ", " + snrLabel(s) + ", corpus word error " + Math.round(w * 100) + " percent over " + cell.length + " transcripts. Show transcripts." });
          b.style.background = colour(w);
          b.appendChild(document.createTextNode(Math.round(w * 100) + "%"));
          b.appendChild(el("small", null, cell.length + " clips"));
          b.addEventListener("click", function () { st.cell = { c: c, s: s }; st.shown = 6; drawHeat(); drawDetail(); });
          var td = el("td"); td.appendChild(b); tr.appendChild(td);
        });
        body.appendChild(tr);
      });
      t.appendChild(body);
    }

    function norm(s) { return s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean); }
    // word alignment by edit distance; shows which words were wrong. Scoring itself uses the Whisper normaliser in the run.
    function align(ref, hyp) {
      var n = ref.length, m = hyp.length, D = [], i, j;
      for (i = 0; i <= n; i++) { D.push(new Array(m + 1).fill(0)); D[i][0] = i; }
      for (j = 0; j <= m; j++) D[0][j] = j;
      for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
        D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
      }
      var refOps = [], hypOps = []; i = n; j = m;
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) {
          var same = ref[i - 1] === hyp[j - 1];
          refOps.push([ref[i - 1], same ? "=" : "s"]); hypOps.push([hyp[j - 1], same ? "=" : "s"]); i--; j--;
        } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { refOps.push([ref[i - 1], "d"]); i--; }
        else { hypOps.push([hyp[j - 1], "i"]); j--; }
      }
      return { ref: refOps.reverse(), hyp: hypOps.reverse() };
    }
    function paint(p, label, ops) {
      p.appendChild(el("span", { "class": "lab" }, label));
      ops.forEach(function (o, k) {
        var node = o[1] === "=" ? document.createTextNode(o[0]) : o[1] === "i" ? el("ins", null, o[0]) : o[1] === "d" ? el("del", null, o[0]) : el("span", { "class": "sub" }, o[0]);
        p.appendChild(node); if (k < ops.length - 1) p.appendChild(document.createTextNode(" "));
      });
      if (!ops.length) p.appendChild(document.createTextNode("(nothing)"));
    }

    function drawDetail() {
      var box = $("detail");
      if (!st.cell) { box.hidden = true; return; }
      box.hidden = false;
      $("f-utt").hidden = st.model >= 0;
      var items = recs.filter(function (r) { return r.codec === st.cell.c && r.snr === st.cell.s && (st.model < 0 ? r.u === st.call : r.m === st.model); });
      items.sort(function (a, b) { return a.m - b.m || a.u.localeCompare(b.u); });
      $("detail-h").textContent = (CODEC[st.cell.c] || st.cell.c) + ", " + snrLabel(st.cell.s) + (st.model < 0 ? ", every model, call " + (calls.indexOf(st.call) + 1) : ", " + d.models[st.model] + " model, " + items.length + " calls");
      var out = $("trs"); clear(out);
      var visible = st.model < 0 ? items : items.slice(0, st.shown);
      visible.forEach(function (r) {
        var a = align(norm(d.utterances[r.u]), norm(r.hyp));
        var card = el("div", { "class": "tr" });
        var meta = el("div", { "class": "meta" });
        var left = el("span"); left.appendChild(el("b", null, d.models[r.m])); left.appendChild(document.createTextNode("  call " + (calls.indexOf(r.u) + 1)));
        meta.appendChild(left); meta.appendChild(el("span", null, "errors " + r.e + " of " + r.n + " words"));
        card.appendChild(meta);
        var p1 = el("p"); paint(p1, "Said", a.ref); card.appendChild(p1);
        var p2 = el("p"); paint(p2, "Wrote", a.hyp); card.appendChild(p2);
        out.appendChild(card);
      });
      if (st.model >= 0 && items.length > st.shown) {
        var more = el("button", { type: "button", "class": "btn" }, "Show 6 more calls (" + (items.length - st.shown) + " left)");
        more.addEventListener("click", function () { st.shown += 6; drawDetail(); });
        out.appendChild(more);
      }
    }

    seg.addEventListener("change", function (e) { if (e.target.name === "mdl") { st.model = parseInt(e.target.value, 10); st.shown = 6; drawHeat(); drawDetail(); } });
    sel.addEventListener("change", function () { st.call = sel.value; drawDetail(); });
    document.querySelector('input[name="mdl"][value="-1"]').checked = true;
    drawHeat();
  }
})();
