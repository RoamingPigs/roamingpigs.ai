import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const M = require("../site/js/model.js");
const data = JSON.parse(fs.readFileSync(new URL("../data/model.json", import.meta.url), "utf8"));
const base = { model: "d70", quant: "q4_k_m", context: 16384, hardware: "apu", tariff: 0.18, duty: 1, api: 0.5, kvBytes: 2 };
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} vs ${b}`);

test("KV cache uses kv_heads, not hidden size", () => {
  const r = M.compute(data, base);
  // 2 (K and V) * 80 layers * 8 kv heads * 128 head dim * 16384 tokens * 2 bytes
  close(r.kvGB, (2 * 80 * 8 * 128 * 16384 * 2) / 1e9);
  assert.ok(r.kvGB < 6, "an 8B-hidden-size formula would give about 21 GB");
});

test("weights follow bits per weight", () => {
  const r = M.compute(data, base);
  close(r.weightsGB, (70.6 * 4.89) / 8);
});

test("every KV byte is read each token (weight 1.0, not 0.05)", () => {
  const r = M.compute(data, base);
  close(r.readGB, r.activeGB + r.kvGB);
});

test("mixture of experts reads only active weights but stores all", () => {
  const r = M.compute(data, { ...base, model: "m30" });
  close(r.activeGB, (3.3 * 4.89) / 8);
  close(r.weightsGB, (30.5 * 4.89) / 8);
  assert.ok(r.ceiling > M.compute(data, base).ceiling * 10);
});

test("ceiling equals efficiency * peak / bytes read", () => {
  const r = M.compute(data, base);
  close(r.ceiling, (0.84 * 256) / r.readGB);
});

test("a 70B Q4 model on the APU lands in the published 4.5 to 5.1 tok/s band", () => {
  const r = M.compute(data, { ...base, context: 4096 });
  assert.ok(r.tokLow < 5.1 && r.tokHigh > 4.5, `${r.tokLow}..${r.tokHigh}`);
});

test("fit check respects capacity and overhead", () => {
  assert.equal(M.compute(data, { ...base, quant: "fp16" }).fits, false);
  assert.equal(M.compute(data, { ...base, quant: "q8_0", hardware: "h100" }).fits, false);
  assert.equal(M.compute(data, { ...base, hardware: "h100" }).fits, true);
  assert.equal(M.compute(data, { ...base, model: "d8" }).fits, true);
});

test("energy per token is power over speed, and ranges are ordered", () => {
  const r = M.compute(data, { ...base, model: "m30" });
  close(r.jLow, r.powerW / r.tokHigh);
  close(r.jHigh, r.powerW / r.tokLow);
  assert.ok(r.jLow < r.jHigh && r.tokLow < r.tokHigh);
});

test("electricity cost: kW * tariff per hour over tokens per hour", () => {
  const r = M.compute(data, { ...base, model: "m30" });
  close(r.elecMid, (r.powerW / 1000 * 0.18) / (r.tokMid * 3600) * 1e6);
});

test("hardware cost per token falls as duty rises", () => {
  const lo = M.compute(data, { ...base, duty: 0.25 });
  const hi = M.compute(data, { ...base, duty: 1 });
  assert.ok(lo.totalMid > hi.totalMid);
});

test("rented hardware ignores duty", () => {
  const a = M.compute(data, { ...base, model: "d8", hardware: "h100", duty: 0.1 });
  const b = M.compute(data, { ...base, model: "d8", hardware: "h100", duty: 1 });
  close(a.totalMid, b.totalMid);
});

test("URL state round-trips and rejects garbage", () => {
  const s = M.encode({ ...base, tariff: 0.2, duty: 0.5, api: 0.7 });
  const d = M.decode(s, data);
  assert.equal(d.model, "d70"); close(d.tariff, 0.2); close(d.duty, 0.5);
  const bad = M.decode("m=<script>&c=-5&h=nope&t=abc", data);
  assert.equal(bad.model, data.defaults.model); assert.equal(bad.hardware, "apu");
  assert.equal(bad.context, data.defaults.context);
});
