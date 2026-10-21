#!/usr/bin/env node
/* Behörighetsprov, del 2: läs/skriv som olika användare mot målmiljön (granskning #75).

   Kör från bess-dashboard/ på en dator som når Supabase:

     SUPABASE_URL=https://<projekt>.supabase.co \
     SUPABASE_ANON_KEY=<publishable key> \
     JWT_EJ_TILLATEN=<access token för en inloggad som INTE står i allowed_users> \
     JWT_MONTOR=<access token för en montör> \
     JWT_ADMIN=<access token för en administratör> \
     node scripts/behorighetsprov.mjs > docs/behorighetsprov-$(date +%F).md

   Token hämtas genom att logga in i appen som respektive användare och läsa
   supabase.auth.getSession() i webbläsarens konsol. Saknas en token hoppas den
   rollen över och markeras "ej provad". Skriptet skriver bara till rader och
   filer som det själv skapar och tar bort efteråt (prefix "behorighetsprov-").
   Det rör aldrig portfolj/state eller portfolj/ekonomi. Att bara admin kan skriva
   ekonomin syns i del 1 (policyn) och provas i appen (Data → Lagring). */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.error("SUPABASE_URL och SUPABASE_ANON_KEY krävs.");
  process.exit(2);
}

const ROLLER = [
  ["anonym", null],
  ["ej tillåten", process.env.JWT_EJ_TILLATEN],
  ["montör", process.env.JWT_MONTOR],
  ["admin", process.env.JWT_ADMIN],
];

const klient = (jwt) =>
  createClient(URL, ANON, { auth: { persistSession: false }, global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : {} });

const ID = `behorighetsprov-${Date.now()}`;

/* Förväntat utfall per roll: [anonym, ej tillåten, montör, admin]. true = ska lyckas. */
const PROV = [
  ["Läsa portfolj/state", [false, false, true, true], (db) => db.from("app_state").select("key").eq("key", "portfolj/state").then(raderFinns)],
  ["Läsa portfolj/ekonomi", [false, false, true, true], (db) => db.from("app_state").select("key").eq("key", "portfolj/ekonomi").then(raderFinns)],
  ["Skapa egen app_state-rad", [false, false, true, true], async (db) => {
    const r = await db.from("app_state").insert({ key: ID, value: { prov: true } }).select("key");
    if (!r.error) await klient(process.env.JWT_ADMIN).from("app_state").delete().eq("key", ID);
    return utfall(r);
  }],
  ["Läsa andringslogg", [false, false, true, true], (db) => db.from("andringslogg").select("id").limit(1).then(raderFinns)],
  ["Ändra en loggpost (ska alltid nekas)", [false, false, false, false], async (db) => {
    const r = await db.from("andringslogg").update({ text: "ändrad" }).eq("text", "__finns_inte__").select("id");
    return { ok: !r.error && (r.data || []).length > 0, text: r.error?.message || "0 rader" };
  }],
  ["Läsa allowed_users", [false, false, true, true], (db) => db.from("allowed_users").select("email").limit(1).then(raderFinns)],
  ["Lägga till sig själv i allowed_users", [false, false, false, true], async (db) => {
    const r = await db.from("allowed_users").insert({ email: `${ID}@exempel.invalid`, role: "montor" }).select("email");
    if (!r.error) await klient(process.env.JWT_ADMIN).from("allowed_users").delete().eq("email", `${ID}@exempel.invalid`);
    return utfall(r);
  }],
  ["Lista protokoll", [false, false, true, true], (db) => db.from("protokoll").select("id").limit(1).then(raderFinns)],
  ["Ladda ner en ritning (Storage)", [false, false, true, true], async (db) => {
    const lista = await klient(process.env.JWT_ADMIN).storage.from("ritningar").list("", { limit: 1 });
    const mapp = lista.data?.[0]?.name;
    if (!mapp) return { ok: false, text: "inga ritningar att prova mot" };
    const filer = await klient(process.env.JWT_ADMIN).storage.from("ritningar").list(mapp, { limit: 1 });
    const fil = filer.data?.[0]?.name;
    if (!fil) return { ok: false, text: "inga ritningar att prova mot" };
    const r = await db.storage.from("ritningar").download(`${mapp}/${fil}`);
    return { ok: !r.error && !!r.data, text: r.error?.message || "nedladdad" };
  }],
  ["Ladda upp en fil till ritningar", [false, false, true, true], async (db) => {
    const sokvag = `${ID}/prov.txt`;
    const r = await db.storage.from("ritningar").upload(sokvag, new Blob(["prov"]), { upsert: false });
    if (!r.error) await klient(process.env.JWT_ADMIN).storage.from("ritningar").remove([sokvag]);
    return { ok: !r.error, text: r.error?.message || "uppladdad" };
  }],
  ["Läsa godkannanden (F05)", [false, false, true, true], (db) => db.from("godkannanden").select("id").limit(1).then(raderFinns)],
  ["Skriva godkannanden direkt (ska alltid nekas)", [false, false, false, false], async (db) => {
    const r = await db.from("godkannanden").insert({ projekt_id: "36037", typ: "grind", objekt_id: ID, varde: {}, kvitterad_av: "00000000-0000-0000-0000-000000000000", kvitterad_epost: "x" }).select("id");
    return utfall(r);
  }],
  ["RPC reservera_paminnelser (ska alltid nekas för klienter)", [false, false, false, false], async (db) => {
    const r = await db.rpc("reservera_paminnelser", { p_rader: [], p_las_sekunder: 1 });
    return { ok: !r.error, text: r.error?.message || "kördes" };
  }],
];

function utfall(r) {
  return { ok: !r.error && (r.data ?? true) !== null, text: r.error ? `${r.error.code || ""} ${r.error.message}`.trim() : "lyckades" };
}
function raderFinns(r) {
  /* RLS ger tomt svar i stället för fel vid läsning: 0 rader räknas som nekad. */
  return { ok: !r.error && (r.data || []).length > 0, text: r.error ? `${r.error.code || ""} ${r.error.message}`.trim() : `${(r.data || []).length} rader` };
}

const datum = new Date().toISOString().slice(0, 16).replace("T", " ");
const ut = [`# Behörighetsprov ${datum}`, "", `Mål: ${URL}`, "", "| Prov | Roll | Förväntat | Utfall | Svar |", "| --- | --- | --- | --- | --- |"];
let avvikelser = 0;
for (const [namn, forvantat, kor] of PROV) {
  for (let i = 0; i < ROLLER.length; i++) {
    const [roll, jwt] = ROLLER[i];
    if (i > 0 && !jwt) {
      ut.push(`| ${namn} | ${roll} | ${forvantat[i] ? "tillåtet" : "nekat"} | ej provad | token saknas |`);
      continue;
    }
    let r;
    try {
      r = await kor(klient(jwt));
    } catch (e) {
      r = { ok: false, text: String(e?.message || e) };
    }
    const stammer = r.ok === forvantat[i];
    if (!stammer) avvikelser++;
    ut.push(`| ${namn} | ${roll} | ${forvantat[i] ? "tillåtet" : "nekat"} | ${stammer ? "som väntat" : "**AVVIKER**"} (${r.ok ? "lyckades" : "nekades"}) | ${String(r.text).replace(/\|/g, "/")} |`);
  }
}
ut.push("", avvikelser ? `**${avvikelser} avvikelser.** Åtgärda innan issue #75 stängs.` : "Inga avvikelser.", "", "Del 1 (grants, policyer, backup): klistra in utdata från supabase/prov/behorighetsprov.sql nedan.", "");
console.log(ut.join("\n"));
process.exit(avvikelser ? 1 : 0);
