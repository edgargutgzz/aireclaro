#!/usr/bin/env node
// Manual audit of the SIMA data behind /datos, run before each monthly report.
// Read-only: it never writes to Supabase. Nothing in the site runs it.
//
//   node scripts/revisar-mes.mjs 2026-09   one month, in depth
//   node scripts/revisar-mes.mjs 2026      every loaded month of a year vs SINAICA
//
// Month mode
//   1. Hours: every station/pollutant/hour in sima_mediciones_finales against
//      a fresh SINAICA download (the monthly cron's own request).
//   2. Calculations, recomputed here from the raw hours, independently of the
//      site's code and of the sima_promedios_diarios view: daily averages
//      (val = 1, valor >= 0, >= 18 valid hours, rounded by the first decimal),
//      sima_cobertura_diaria, the month's row in sima_insalubres_mensual, and
//      the month's quarter in sima_promedio_trimestral.
//   3. Flags for the report: days with no valid station, network-wide gaps,
//      stations with low coverage, days over the norm decided by one station,
//      and days that only cross the limit because of a single hour.
//
// Year mode
//   Hours only (step 1) for every month of the year that is already loaded,
//   so late or changed SINAICA data shows up. Updating a month is a manual
//   run of the monthly cron (Vercel → Cron Jobs → Run, or ?month=YYYY-MM).
//
// The norm limits and the rounding rule are written out here on purpose
// rather than imported from lib/: an audit that reused the site's code would
// share its bugs. Keep them in step with lib/pm25-limits.ts.

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------- setup

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SINAICA_URL = "https://sinaica.inecc.gob.mx/lib/libd/cnxn.php";
const PARAMS = ["PM2.5", "PM10"];

// NOM-025-SSA1-2021 daily limits; tightened on 2025-12-27 (lib/pm25-limits.ts).
const limitFor = (param, fecha) =>
  param === "PM2.5" ? (fecha >= "2025-12-27" ? 25 : 33) : fecha >= "2025-12-27" ? 50 : 60;

// NOM-025 §4.2.1.1: the exact average, decided by its first decimal (0-4 stays,
// 5-9 goes up).
const nomRound = (x) => {
  const oneDecimal = Math.floor(x * 10 + 1e-9) / 10;
  const whole = Math.floor(oneDecimal);
  return whole + (oneDecimal - whole >= 0.5 - 1e-9 ? 1 : 0);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Paginated read. Every multi-page query must carry an `order`: without one,
// PostgREST's pages aren't stable and rows get skipped or repeated.
async function db(query) {
  const out = [];
  for (let page = 0; ; page++) {
    let res;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
        headers: { apikey: SUPABASE_KEY, Range: `${page * 1000}-${page * 1000 + 999}` },
      });
      if (res.ok) break;
      await sleep(2000);
    }
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${query}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

async function sinaicaMonth(sinaicaId, param, year, month) {
  const init = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const body = new URLSearchParams({
    metodo: "getDatos", estacionesId: String(sinaicaId), fechaInit: init, fechaFin: next,
    paramId: param, nivel: "1000", campos: "2", limit: "1", inc: "1", soloVal: "1",
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(SINAICA_URL, { method: "POST", body, signal: AbortSignal.timeout(90_000) });
      const text = (await res.text()).trim();
      await sleep(300);
      if (!text || text === "null" || text === "[]") return [];
      return JSON.parse(text).filter((r) => r.fecha.startsWith(init.slice(0, 7)));
    } catch (err) {
      if (attempt === 2) throw err;
      await sleep(3000);
    }
  }
}

const daysIn = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const pad = (n) => String(n).padStart(2, "0");
const isValidHour = (r) => r.valor !== null && r.valor !== "" && Number(r.val) === 1 && Number(r.valor) >= 0;

// ---------------------------------------------------------------- hours vs SINAICA

async function compareHours(stations, year, month) {
  const ym = `${year}-${pad(month)}`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  const rows = [];
  let totalGrid = 0;
  for (const s of stations) {
    for (const param of PARAMS) {
      const stored = await db(
        `sima_mediciones_finales?select=fecha,hora,valor,val&sensor_id=eq.${s.sensor_id}&parametro=eq.${param}` +
          `&fecha=gte.${ym}-01&fecha=lt.${next}&order=fecha.asc,hora.asc`,
      );
      totalGrid += stored.length;
      const source = await sinaicaMonth(s.sinaica_id, param, year, month);
      const src = new Map(
        source.filter((r) => r.valor !== "" && r.valor !== null).map((r) => [`${r.fecha}|${Number(r.hora)}`, Number(r.valor)]),
      );
      const mine = new Map(stored.filter((r) => r.valor !== null).map((r) => [`${r.fecha}|${r.hora}`, Number(r.valor)]));
      const missing = [...src.keys()].filter((k) => !mine.has(k));
      const extra = [...mine.keys()].filter((k) => !src.has(k));
      const changed = [...src.keys()].filter((k) => mine.has(k) && Math.abs(src.get(k) - mine.get(k)) > 1e-6);
      rows.push({ station: s.nombre, param, stored: mine.size, sinaica: src.size, missing, extra, changed });
    }
  }
  return { rows, totalGrid, expectedGrid: stations.length * PARAMS.length * daysIn(year, month) * 24 };
}

function printHours({ rows, totalGrid, expectedGrid }, label) {
  const bad = rows.filter((r) => r.missing.length || r.extra.length || r.changed.length);
  console.log(`\n== Hours vs SINAICA, ${label}`);
  console.log(`grid rows: ${totalGrid} (expected ${expectedGrid})`);
  if (bad.length === 0) {
    console.log(`all ${rows.length} station/pollutant series match SINAICA exactly`);
    return;
  }
  for (const r of bad) {
    console.log(
      `DIFFERENT ${r.station} ${r.param}: ${r.missing.length} hours only in SINAICA, ${r.extra.length} only stored, ` +
        `${r.changed.length} changed values` +
        (r.missing.length ? ` (e.g. ${r.missing.slice(0, 3).join(", ")})` : "") +
        (r.changed.length ? ` (e.g. ${r.changed.slice(0, 3).join(", ")})` : ""),
    );
  }
}

// ---------------------------------------------------------------- month mode

async function checkMonth(stations, year, month) {
  const ym = `${year}-${pad(month)}`;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  const names = Object.fromEntries(stations.map((s) => [s.sensor_id, s.nombre]));
  const nDays = daysIn(year, month);
  const fechas = Array.from({ length: nDays }, (_, i) => `${ym}-${pad(i + 1)}`);

  // 1. Hours
  printHours(await compareHours(stations, year, month), ym);

  // 2. Daily averages, recomputed from the stored hours
  const hours = {}; // sensor|param|fecha -> [{hora, valor}]
  const coverage = {}; // sensor|param -> valid hours in the month
  for (const s of stations) {
    for (const param of PARAMS) {
      const rows = await db(
        `sima_mediciones_finales?select=fecha,hora,valor,val&sensor_id=eq.${s.sensor_id}&parametro=eq.${param}` +
          `&fecha=gte.${ym}-01&fecha=lt.${next}&order=fecha.asc,hora.asc`,
      );
      coverage[`${s.sensor_id}|${param}`] = rows.filter(isValidHour).length;
      for (const r of rows.filter(isValidHour)) {
        (hours[`${s.sensor_id}|${param}|${r.fecha}`] ??= []).push({ hora: r.hora, valor: Number(r.valor) });
      }
    }
  }
  const daily = {}; // sensor|param|fecha -> { exact, rounded, n } | null
  for (const s of stations)
    for (const param of PARAMS)
      for (const f of fechas) {
        const h = hours[`${s.sensor_id}|${param}|${f}`] ?? [];
        const exact = h.length >= 18 ? h.reduce((a, b) => a + b.valor, 0) / h.length : null;
        daily[`${s.sensor_id}|${param}|${f}`] = exact === null ? null : { exact, rounded: nomRound(exact), n: h.length, h };
      }

  // sima_cobertura_diaria
  const cob = await db(`sima_cobertura_diaria?select=sensor_id,fecha,parametro,cubierto&fecha=gte.${ym}-01&fecha=lt.${next}&sensor_id=neq.FIN`);
  const cobMap = new Map(cob.map((r) => [`${r.sensor_id}|${r.parametro}|${r.fecha}`, r.cubierto]));
  const cobBad = Object.keys(daily).filter((k) => cobMap.get(k) !== (daily[k] !== null));
  console.log(`\n== sima_cobertura_diaria, ${ym}`);
  console.log(cobBad.length ? `MISMATCH on ${cobBad.length} station-days, e.g. ${cobBad.slice(0, 5).join(", ")}` : `all ${Object.keys(daily).length} station-days match`);

  // sima_insalubres_mensual
  const mensual = await db(`sima_insalubres_mensual?select=parametro,dias_insalubres,dias_insalubres_limite_actual,dias_totales&ano=eq.${year}&mes=eq.${month}`);
  console.log(`\n== sima_insalubres_mensual, ${ym}`);
  const overDays = {};
  for (const param of PARAMS) {
    const withData = fechas.filter((f) => stations.some((s) => daily[`${s.sensor_id}|${param}|${f}`]));
    const limitNow = limitFor(param, "9999-12-31");
    overDays[param] = withData
      .map((f) => ({
        fecha: f,
        over: stations
          .map((s) => ({ s, d: daily[`${s.sensor_id}|${param}|${f}`] }))
          .filter(({ d }) => d && d.rounded > limitFor(param, f)),
      }))
      .filter((x) => x.over.length > 0);
    const overNow = withData.filter((f) =>
      stations.some((s) => (daily[`${s.sensor_id}|${param}|${f}`]?.rounded ?? -1) > limitNow),
    ).length;
    const row = mensual.find((r) => r.parametro === param);
    const same =
      row && row.dias_totales === withData.length && row.dias_insalubres === overDays[param].length &&
      row.dias_insalubres_limite_actual === overNow;
    console.log(
      `${param}: recomputed ${overDays[param].length} days over the norm of ${withData.length} with data` +
        ` (current limit: ${overNow}); table ${row ? `${row.dias_insalubres} of ${row.dias_totales} (current limit: ${row.dias_insalubres_limite_actual})` : "has no row"}` +
        ` -> ${same ? "match" : "MISMATCH"}`,
    );
  }

  // sima_promedio_trimestral, the month's quarter (needs the quarter's other months)
  const q = Math.ceil(month / 3);
  const qStart = `${year}-${pad(q * 3 - 2)}-01`;
  const qEnd = q === 4 ? `${year + 1}-01-01` : `${year}-${pad(q * 3 + 1)}-01`;
  const qDays = [0, 1, 2].reduce((sum, i) => sum + daysIn(year, q * 3 - 2 + i), 0);
  const trim = await db(`sima_promedio_trimestral?select=*&ano=eq.${year}&trimestre=eq.${q}&sensor_id=neq.FIN`);
  let trimBad = 0;
  for (const s of stations) {
    for (const param of PARAMS) {
      const rows = await db(
        `sima_mediciones_finales?select=fecha,valor,val&sensor_id=eq.${s.sensor_id}&parametro=eq.${param}` +
          `&fecha=gte.${qStart}&fecha=lt.${qEnd}&order=fecha.asc,hora.asc`,
      );
      const byDay = {};
      for (const r of rows.filter(isValidHour)) (byDay[r.fecha] ??= []).push(Number(r.valor));
      const vals = Object.values(byDay).filter((v) => v.length >= 18).map((v) => nomRound(v.reduce((a, b) => a + b, 0) / v.length));
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      const t = trim.find((r) => r.sensor_id === s.sensor_id && r.parametro === param);
      const ok =
        t && t.dias_validos === vals.length && t.dias_totales === qDays && t.valido === vals.length / qDays >= 0.75 &&
        (avg === null ? t.promedio === null : Math.abs(avg - t.promedio) < 1e-9);
      if (!ok) {
        trimBad++;
        console.log(`MISMATCH Q${q} ${s.nombre} ${param}: recomputed ${vals.length} valid days, avg ${avg}; table ${t ? `${t.dias_validos}, ${t.promedio}` : "no row"}`);
      }
    }
  }
  console.log(`\n== sima_promedio_trimestral, ${year} Q${q}`);
  console.log(trimBad ? `${trimBad} mismatches (listed above)` : `all ${stations.length * PARAMS.length} station/pollutant rows match`);

  // 3. Flags
  console.log(`\n== Flags for the report, ${ym}`);
  for (const param of PARAMS) {
    const noData = fechas.filter((f) => !stations.some((s) => daily[`${s.sensor_id}|${param}|${f}`]));
    console.log(`${param}: days with no valid station: ${noData.length ? noData.join(", ") : "none"}`);
  }
  // Network-wide gaps: runs of 3+ hours where 10+ of the stations have no PM2.5 hour.
  const gaps = [];
  let run = null;
  for (const f of fechas)
    for (let hora = 0; hora < 24; hora++) {
      const silent = stations.filter(
        (s) => !(hours[`${s.sensor_id}|PM2.5|${f}`] ?? []).some((h) => h.hora === hora),
      ).length;
      if (silent >= 10) {
        run ??= { from: `${f} ${pad(hora)}:00`, n: 0 };
        run.n++;
        run.to = `${f} ${pad(hora)}:00`;
      } else if (run) {
        if (run.n >= 3) gaps.push(run);
        run = null;
      }
    }
  if (run && run.n >= 3) gaps.push(run);
  console.log(`network-wide gaps (10+ stations silent, PM2.5): ${gaps.length ? gaps.map((g) => `${g.from} to ${g.to} (${g.n} h)`).join("; ") : "none"}`);

  const low = Object.entries(coverage)
    .filter(([, n]) => n / (nDays * 24) < 0.8)
    .map(([k, n]) => `${names[k.split("|")[0]]} ${k.split("|")[1]} ${Math.round((n / (nDays * 24)) * 100)}%`);
  console.log(`stations under 80% of hours: ${low.length ? low.join(", ") : "none"}`);

  for (const param of PARAMS) {
    const single = overDays[param].filter((d) => d.over.length === 1);
    console.log(
      `${param}: ${overDays[param].length} days over the norm, ${single.length} decided by one station` +
        (single.length ? `: ${single.map((d) => `${d.fecha.slice(8)} ${names[d.over[0].s.sensor_id]} (${d.over[0].d.rounded})`).join(", ")}` : ""),
    );
    // A day decided by one spike: every station over the limit has an hour at
    // least twice its own median hour that day, and without that hour it
    // would be within the limit. (Dropping the highest hour always lowers an
    // average, so the 2x test keeps near-limit days from all being flagged.)
    const median = (xs) => {
      const v = [...xs].sort((a, b) => a - b);
      return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
    };
    const spikeOf = (v, fecha) => {
      const vals = v.h.map((x) => x.valor);
      const top = v.h.reduce((a, b) => (b.valor > a.valor ? b : a));
      if (top.valor < 2 * median(vals)) return null;
      const without = vals.filter((_, i) => i !== vals.indexOf(top.valor));
      const under = without.length < 18 || nomRound(without.reduce((a, b) => a + b, 0) / without.length) <= limitFor(param, fecha);
      return under ? top : null;
    };
    const spikes = overDays[param].filter((d) => d.over.every(({ d: v }) => spikeOf(v, d.fecha)));
    console.log(
      `${param}: days over the norm only because of a spike hour: ` +
        (spikes.length
          ? spikes
              .map((d) =>
                d.over
                  .map(({ s, d: v }) => {
                    const top = spikeOf(v, d.fecha);
                    return `${d.fecha.slice(8)} ${names[s.sensor_id]} (${top.valor} at ${pad(top.hora)}:00, daily median ${median(v.h.map((x) => x.valor))})`;
                  })
                  .join(" + "),
              )
              .join(", ")
          : "none"),
    );
  }
}

// ---------------------------------------------------------------- main

const arg = process.argv[2] ?? "";
const stationsRaw = await db("sima_sensores?select=sensor_id,sinaica_id,nombre_display&sensor_id=neq.FIN");
const stations = stationsRaw.map((s) => ({ ...s, nombre: s.nombre_display })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

if (/^\d{4}-\d{2}$/.test(arg)) {
  const [y, m] = arg.split("-").map(Number);
  console.log(`Monthly check, ${arg} (${stations.length} metro stations, PM2.5 and PM10)`);
  await checkMonth(stations, y, m);
} else if (/^\d{4}$/.test(arg)) {
  const y = Number(arg);
  const latest = await db(`sima_mediciones_finales?select=fecha&fecha=gte.${y}-01-01&fecha=lt.${y + 1}-01-01&order=fecha.desc&limit=1`);
  if (!latest.length) {
    console.log(`No stored data for ${y}.`);
    process.exit(0);
  }
  const lastMonth = Number(latest[0].fecha.slice(5, 7));
  console.log(`Year check, ${y}: January to ${latest[0].fecha.slice(0, 7)} against SINAICA`);
  for (let m = 1; m <= lastMonth; m++) printHours(await compareHours(stations, y, m), `${y}-${pad(m)}`);
} else {
  console.log("Usage: node scripts/revisar-mes.mjs YYYY-MM   (one month)\n       node scripts/revisar-mes.mjs YYYY      (a year's hours vs SINAICA)");
  process.exit(1);
}
