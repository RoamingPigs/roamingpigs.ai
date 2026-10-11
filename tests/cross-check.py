#!/usr/bin/env python3
"""Second independent route: recompute the model in Python and compare with model.js.

Run: python3 tests/cross-check.py   (needs node). Fixed seed, 400 random input sets.
Exits 1 on any disagreement beyond 1e-9 relative.
"""
import json, random, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "data/model.json").read_text())
SEC_YEAR = 365.25 * 24 * 3600


def py_model(inp):
    m = next(x for x in data["models"] if x["id"] == inp["model"])
    q = next(x for x in data["quants"] if x["id"] == inp["quant"])
    h = next(x for x in data["hardware"] if x["id"] == inp["hardware"])
    weights = m["total_b"] * q["bpw"] / 8
    active = m["active_b"] * q["bpw"] / 8
    kv = 2 * m["layers"] * m["kv_heads"] * m["head_dim"] * inp["context"] * 2 / 1e9
    ceiling = h["efficiency"]["value"] * h["peak_gbps"] / (active + kv)
    f = data["expected_fraction_of_ceiling"][m["kind"]]
    lo, hi = ceiling * f["low"], ceiling * f["high"]
    mid = (lo + hi) / 2
    p = h["power_w"][m["kind"]]
    elec = lambda tok: p / 1000 * inp["tariff"] * 1e6 / (tok * 3600)
    if h["cost"]["mode"] == "rent":
        cap = h["cost"]["usd_per_hour"] / (mid * 3600) * 1e6
    else:
        cap = h["cost"]["price_usd"] / (mid * inp["duty"] * h["cost"]["life_years"] * SEC_YEAR) * 1e6
    return {
        "weightsGB": weights, "kvGB": kv, "ceiling": ceiling, "tokLow": lo, "tokHigh": hi,
        "jLow": p / hi, "jHigh": p / lo, "elecMid": elec(mid), "totalMid": elec(mid) + cap,
        "fits": weights + kv + data["overhead_gb"]["value"] <= h["capacity_gb"],
    }


rng = random.Random(20261011)
cases = [
    {
        "model": rng.choice(data["models"])["id"], "quant": rng.choice(data["quants"])["id"],
        "hardware": rng.choice(data["hardware"])["id"], "context": rng.choice([2048, 4096, 8192, 16384, 32768, 65536, 131072]),
        "tariff": round(rng.uniform(0.05, 0.4), 3), "duty": round(rng.uniform(0.05, 1), 2), "api": 0.5, "kvBytes": 2,
    }
    for _ in range(400)
]
js = f"""
const M = require({json.dumps(str(ROOT / 'site/js/model.js'))});
const data = {json.dumps(data)};
const cases = {json.dumps(cases)};
const keys = ["weightsGB","kvGB","ceiling","tokLow","tokHigh","jLow","jHigh","elecMid","totalMid","fits"];
console.log(JSON.stringify(cases.map(c => {{ const r = M.compute(data, c); const o = {{}}; keys.forEach(k => o[k] = r[k]); return o; }})));
"""
out = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)
bad = 0
for c, got in zip(cases, out):
    want = py_model(c)
    for k, v in want.items():
        g = got[k]
        ok = (g == v) if isinstance(v, bool) else abs(g - v) <= 1e-9 * max(1.0, abs(v))
        if not ok:
            bad += 1
            print(f"MISMATCH {k}: js={g} py={v} for {c}")
print(f"{len(cases)} cases x {len(want)} fields, {bad} mismatches")
sys.exit(1 if bad else 0)
