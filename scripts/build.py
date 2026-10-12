#!/usr/bin/env python3
"""Build roamingpigs.ai from data/model.json, data/canon.json and src/templates.

    python3 scripts/build.py            # render site/
    python3 scripts/build.py --check    # exit 1 if canon or rendered output is stale

The calculator formula lives once, in site/js/model.js. This build runs the node
unit tests and the Python cross-check, and asserts that the expected-fraction
ranges in data/model.json cover every row of the validation table.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path.home() / "projects/siteops/scripts"))

import rpsite_lib as lib  # noqa: E402
from jinja2 import Environment, FileSystemLoader, StrictUndefined  # noqa: E402

SITE = ROOT / "site"
BASE = "https://roamingpigs.ai/"
MODIFIED = "2026-10-11"
MODIFIED_HUMAN = "11 October 2026"
VAL_CTX = 512  # published llama-bench rows are tg128, short context

NAV = [
    {"path": "/inference-cost/", "label": "Inference cost"},
    {"path": "/codec-grid/", "label": "Codec grid"},
    {"path": "/method/", "label": "Method"},
]

PAGES = [
    {
        "path": "/",
        "template": "home.html",
        "title": "RoamingPigs Instruments: AI Cost and Speech Explorers",
        "description": "Calculators and explorers for AI systems that show their assumptions: local inference cost per token, and real speech-model transcripts through noisy channels.",
        "scripts": [],
    },
    {
        "path": "/inference-cost/",
        "template": "inference.html",
        "title": "Local LLM Cost Calculator: Memory, Speed, Energy, Price",
        "description": "Estimate memory, decode speed, energy per token and cost per million tokens for a local model on unified memory, desktop, server or GPU. Sourced, editable, compared with limited reported summaries.",
        "breadcrumb": [("Instruments", "/"), ("Inference cost", "/inference-cost/")],
        "scripts": ["/js/model.js", "/js/calc.js"],
        "sumbar": True,
        "app": {"name": "Local inference cost calculator", "category": "UtilitiesApplication"},
    },
    {
        "path": "/codec-grid/",
        "template": "grid.html",
        "title": "Speech Model Codec Grid: 5,760 Real Transcripts Explorer",
        "description": "Explore 5,760 transcripts from six open speech models reading 40 radio calls through telephone codecs and noise. Read what each model wrote beside what was said.",
        "breadcrumb": [("Instruments", "/"), ("Codec grid", "/codec-grid/")],
        "scripts": ["/js/grid.js"],
        "app": {"name": "Speech model codec grid explorer", "category": "EducationalApplication"},
    },
    {
        "path": "/method/",
        "template": "method.html",
        "title": "Calculator Method: Formula, Constants, Validation",
        "description": "The one formula behind the inference cost calculator, every constant with its source and date, and a source-fitted comparison with reported and published speeds.",
        "breadcrumb": [("Instruments", "/"), ("Method", "/method/")],
        "scripts": [],
    },
]


def utc_label(s: str) -> str:
    m = re.match(r"(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})", s)
    assert m, s
    return f"{m.group(1)} {m.group(2)} UTC"


def node_eval(js: str) -> str:
    return subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout


def kv_gb(m: dict, ctx: int) -> float:
    return 2 * m["layers"] * m["kv_heads"] * m["head_dim"] * ctx * 2 / 1e9


def validation(model: dict, canon: dict) -> dict:
    hw = next(h for h in model["hardware"] if h["id"] == "apu")
    bw = hw["efficiency"]["value"] * hw["peak_gbps"]
    byid = {m["id"]: m for m in model["models"]}
    q4 = next(q for q in model["quants"] if q["id"] == "q4_k_m")["bpw"]
    rows = []

    def add(name, gb, lo, hi, cls, src, kind):
        ceil = bw / gb
        r_lo, r_hi = lo / ceil, hi / ceil
        rows.append({
            "name": name, "gb": f"{gb:.2f}", "ceiling": f"{ceil:.1f}",
            "observed": f"{lo:g}" if lo == hi else f"{lo:g} to {hi:g}",
            "ratio": f"{r_lo:.2f}" if lo == hi else f"{r_lo:.2f} to {r_hi:.2f}",
            "cls": cls, "src": src, "kind": kind, "r": (r_lo, r_hi),
        })

    runs = [r for r in canon["apu"]["reported_runs"] if r["within_bandwidth_assumption"]]
    for r in runs:
        gb = r["weights_gb"] * r["active_b"] / r["params_b"]
        kind = "dense" if r["kind"].startswith("Dense") else "moe"
        nm = f'{r["params_b"]:g}B dense' if kind == "dense" else f'{r["params_b"]:g}B mixture, {r["active_b"]:g}B active'
        add(f"{nm}, Q4_K_M", gb, r["tokens_per_sec"], r["tokens_per_sec"], "reported", "Owner-labeled summary, 2026-10-10, one run; raw power trace absent", kind)
    for mid, lo, hi, src in [
        ("d70", 4.5, 5.1, "Published llama-bench, 2025-07-22 and repo to 2026-03"),
        ("d32", 11.3, 11.3, "Published llama-bench, repo to 2026-03"),
        ("d14", 24.5, 24.5, "Published llama-bench, repo to 2026-03"),
        ("m30", 66.3, 86.1, "Published llama-bench, 2025-07-22 and repo to 2026-03"),
    ]:
        m = byid[mid]
        gb = m["active_b"] * q4 / 8 + kv_gb(m, VAL_CTX)
        add(f'{m["label"]}, Q4_K_M', gb, lo, hi, "published", src, m["kind"])
    for kind, f in model["expected_fraction_of_ceiling"].items():
        for r in rows:
            if r["kind"] != kind:
                continue
            assert f["low"] <= r["r"][0] and r["r"][1] <= f["high"], f"{r['name']} ratio {r['r']} is outside the {kind} range {f}"
    excl = [r for r in canon["apu"]["reported_runs"] if not r["within_bandwidth_assumption"]]
    return {
        "rows": rows, "bw": f"{bw:.0f}", "ctx": VAL_CTX,
        "excl_gbps": f'{excl[0]["implied_gbps"]:.0f}' if excl else "",
        "peak": f'{canon["apu"]["peak_gbps"]:.0f}',
    }


def previews(model: dict, canon: dict) -> dict:
    d = model["defaults"]
    js = f"""
const M = require({json.dumps(str(SITE / 'js/model.js'))});
const data = {json.dumps(model)};
const out = data.hardware.map(h => {{
  const r = M.compute(data, {{model: "{d['model']}", quant: "{d['quant']}", context: {d['context']}, hardware: h.id, tariff: 0.18, duty: 1, api: 0.5, kvBytes: 2}});
  return {{id: h.id, ceiling: r.ceiling, fits: r.fits}};
}});
const h = M.compute(data, {{model: "{d['model']}", quant: "{d['quant']}", context: {d['context']}, hardware: "apu", tariff: {d['tariff_usd_per_kwh']}, duty: 1, api: {d['api_usd_per_mtok']}, kvBytes: 2}});
console.log(JSON.stringify({{rows: out, hero: {{tokLow: h.tokLow, tokHigh: h.tokHigh, jLow: h.jLow, jHigh: h.jHigh, total: h.totalMid, elec: h.elecMid}}}}));
"""
    res = json.loads(node_eval(js))
    rows = res["rows"]
    hh = res["hero"]
    mx = max(r["ceiling"] for r in rows)
    names = {"apu": "APU", "desktop": "Desktop", "server": "Server", "h100": "GPU"}
    m = next(x for x in model["models"] if x["id"] == d["model"])
    q = next(x for x in model["quants"] if x["id"] == d["quant"])
    calc = {
        "label": f'{m["label"]}, {q["label"]}',
        "rows": [{"name": names[r["id"]], "pct": f'{r["ceiling"] / mx * 100:.1f}', "value": f'{r["ceiling"]:.0f}'} for r in rows],
    }
    labs = {"clean": "No noise", "20 dB": "20 dB", "10 dB": "10 dB", "0 dB": "0 dB"}
    w = {k: canon["trcs_v2"]["analysis"]["e2"]["normalised"]["A1_by_noise"][k]["point"] for k in labs}
    vmax = max(w.values())
    grid = {"rows": [{"name": labs[k], "pct": f"{w[k] / vmax * 100:.1f}", "value": f"{w[k] * 100:.0f}%"} for k in labs]}
    def rng(a, b2, d):
        x, y = f"{a:.{d}f}", f"{b2:.{d}f}"
        return x if x == y else f"{x}\u2013{y}"
    hero = {
        "scenario": f'{m["label"]}, {q["label"]}, {d["context"] // 1024}k context, unified-memory APU',
        "tok": rng(hh["tokLow"], hh["tokHigh"], 0), "j": rng(hh["jLow"], hh["jHigh"], 1),
        "cost": f'${hh["total"]:.2f}', "elec": f'${hh["elec"]:.2f}',
    }
    return {"calc": calc, "grid": grid, "hero": hero}


def asset(path: str) -> str:
    h = hashlib.sha256((SITE / path.lstrip("/")).read_bytes()).hexdigest()[:8]
    return f"{path}?v={h}"


def site_ld() -> list[dict]:
    person = {
        "@type": "Person", "@id": BASE + "#author", "name": "Cisco Caceres", "url": "https://ciscocaceres.com/",
        "sameAs": ["https://orcid.org/0009-0005-7810-5077", "https://github.com/RoamingPigs", "https://huggingface.co/RoamingPigs"],
    }
    org = {
        "@type": "Organization", "@id": BASE + "#org", "name": "RoamingPigs", "url": BASE, "logo": BASE + "icon-512.png",
        "founder": {"@id": BASE + "#author"},
        "sameAs": ["https://roamingpigs.org/", "https://roamingpigs.com/", "https://github.com/RoamingPigs", "https://huggingface.co/RoamingPigs"],
    }
    site = {
        "@type": "WebSite", "@id": BASE + "#website", "url": BASE, "name": "RoamingPigs Instruments", "inLanguage": "en",
        "publisher": {"@id": BASE + "#org"}, "author": {"@id": BASE + "#author"},
    }
    return [site, org, person]


def render(model: dict, canon: dict) -> dict[str, str]:
    c = canon
    runs = [r for r in c["apu"]["reported_runs"] if r["within_bandwidth_assumption"]]
    refs = []
    for r in runs:
        dense = r["kind"].startswith("Dense")
        refs.append({
            "label": (f'{r["params_b"]:g}B dense' if dense else f'{r["params_b"]:g}B mixture, {r["active_b"]:g}B active') + f', {r["quant"]}',
            "tok": f'{r["tokens_per_sec"]:.1f}', "w": f'{r["wall_w_mean"]:.0f}', "j": f'{r["power_rate_estimate_j_per_token"]:.2f}',
        })
    ctx = {
        "c": c, "m": model, "v": {"n_transcripts": f"{6 * 960:,}", "n_utt": c["trcs_v2"]["analysis"]["e2"]["n_utterances"], "run_end": c["trcs_v2"]["run"]["finished_utc"]},
        "prev": previews(model, c), "val": validation(model, c),
        "refs": refs, "refs_date": utc_label(c["apu"]["date_utc"]),
        "refs_seconds": f'{min(r["run_seconds"] for r in runs):.0f} to {max(r["run_seconds"] for r in runs):.0f}',
        "nav": NAV, "site": {"modified": MODIFIED, "modified_human": MODIFIED_HUMAN},
    }
    env = Environment(loader=FileSystemLoader(ROOT / "src/templates"), undefined=StrictUndefined, autoescape=False, trim_blocks=True, lstrip_blocks=True)
    env.globals["asset"] = asset
    meta = {
        "base": BASE, "name": "RoamingPigs Instruments", "locale": "en_US", "theme_color": "#0a0b0f", "color_scheme": "dark",
        "author": "Cisco Caceres", "og_image": "og/default.png",
        "og_alt": "RoamingPigs Instruments: calculators and explorers that show their assumptions",
        "person_id": BASE + "#author", "ld": site_ld(),
    }
    out = {}
    for p in PAGES:
        page = dict(p, modified=MODIFIED, og_image=f"og/{p['path'].strip('/') or 'default'}.png" if p["path"] != "/" else "og/default.png")
        page["og_alt"] = p["title"]
        extra = []
        if p.get("app"):
            extra.append({
                "@type": "WebApplication", "name": p["app"]["name"], "url": BASE + p["path"].lstrip("/"),
                "applicationCategory": p["app"]["category"], "operatingSystem": "Any (web browser)",
                "isAccessibleForFree": True, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
                "creator": {"@id": BASE + "#author"},
            })
        head = lib.head_meta(meta, page, extra)
        html = env.get_template(p["template"]).render(head=head, page=page, scripts=["/js/site.js"] + p["scripts"], **ctx)
        rel = "index.html" if p["path"] == "/" else p["path"].strip("/") + "/index.html"
        out[rel] = html
    nf = dict(path="/404.html", title="Page not found | RoamingPigs Instruments", description="This page does not exist.", modified=MODIFIED, noindex=True)
    out["404.html"] = env.get_template("404.html").render(head=lib.head_meta(meta, nf), page=nf, scripts=["/js/site.js"], **ctx)
    out["data/model.json"] = json.dumps(model, indent=2, ensure_ascii=False) + "\n"
    return out


def static_files() -> dict[str, str]:
    manifest = {
        "name": "RoamingPigs Instruments", "short_name": "RP Instruments", "start_url": "/", "display": "browser",
        "background_color": "#0a0b0f", "theme_color": "#0a0b0f",
        "icons": [{"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"}],
    }
    headers = """/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()
  Cache-Control: public, max-age=0, must-revalidate

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/css/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=31536000, immutable

/data/*
  Cache-Control: public, max-age=3600

/og/*
  Cache-Control: public, max-age=86400

/*.png
  Cache-Control: public, max-age=86400
"""
    sec = f"Contact: https://ciscocaceres.com/contact/\nExpires: 2027-10-11T00:00:00.000Z\nPreferred-Languages: en\nCanonical: {BASE}.well-known/security.txt\n"
    gpc = json.dumps({"gpc": True, "lastUpdate": MODIFIED}) + "\n"
    return {"site.webmanifest": json.dumps(manifest, indent=2) + "\n", "_headers": headers, "_redirects": RETIRED_REDIRECTS, ".well-known/security.txt": sec, ".well-known/gpc.json": gpc}


# Files from the pilot design. Pages kept serving them after they left the deployment, so they redirect.
RETIRED_REDIRECTS = "/css/style.css /css/site.css 301\n/js/calculator.js /js/calc.js 301\n/data/e2-grid.json /data/e2v2-grid.json 301\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    canon_cmd = [sys.executable, str(Path.home() / "projects/siteops/scripts/rp-canon.py"), "--out", str(ROOT / "data/canon.json"), "--sections", "trcs,apu,trcs_v2", "--grid-v2", str(SITE / "data/e2v2-grid.json")]
    if a.check and subprocess.run(canon_cmd + ["--check"]).returncode:
        return 1
    for cmd in (["node", "--test", str(ROOT / "tests/model.test.mjs")], [sys.executable, str(ROOT / "tests/cross-check.py")]):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode:
            print(r.stdout[-1500:], r.stderr[-800:], file=sys.stderr)
            print("model tests failed; not building", file=sys.stderr)
            return 1
    model = json.loads((ROOT / "data/model.json").read_text(encoding="utf-8"))
    canon = json.loads((ROOT / "data/canon.json").read_text(encoding="utf-8"))
    out = render(model, canon)
    out.update(static_files())
    stale = []
    for rel, text in out.items():
        path = SITE / rel
        if a.check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                stale.append(rel)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
    if a.check:
        if stale:
            print("STALE output:", ", ".join(stale), file=sys.stderr)
            return 1
        print(f"ok: {len(out)} files match; model tests pass")
        return 0
    pages = [dict(p, modified=MODIFIED) for p in PAGES]
    lib.write_sitemap(SITE, BASE, pages)
    lib.write_robots(SITE, BASE)
    print(f"built {len(out)} files + sitemap.xml, robots.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
