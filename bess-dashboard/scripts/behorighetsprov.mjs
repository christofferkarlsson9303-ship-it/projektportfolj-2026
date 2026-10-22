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
import { bedomProvsvar, slutresultat, kontrolleraStadning } from "./behorighetsprov-resultat.mjs";

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
  ["Läsa portfolj/state", [false, false, true, true], (db) => db.from("app_state").select("key").eq("key", "portfolj/state").then(kandRad)],
  ["Läsa portfolj/ekonomi", [false, false, true, true], (db) => db.from("app_state").select("key").eq("key", "portfolj/ekonomi").then(kandRad)],
  ["Skapa egen app_state-rad", [false, false, false, true], async (db) => {
    if (!process.env.JWT_ADMIN) return { ok: null, text: "Admininloggning krävs för säker städning" };
    const r = await db.from("app_state").insert({ key: ID, value: { prov: true } }).select("key");
    if (!r.error) kontrolleraStadning(await klient(process.env.JWT_ADMIN).from("app_state").delete().eq("key", ID).select("key"));
    return utfall(r);
  }],
  ["Läsa andringslogg", [false, false, true, true], (db) => db.from("andringslogg").select("id").limit(1).then(raderFinns)],
  ["Ändra en loggpost (ska alltid nekas)", [false, false, false, false], async (db) => {
    const r = await db.from("andringslogg").update({ text: "ändrad" }).eq("text", "__finns_inte__").select("id");
    return bedomProvsvar(r);
  }],
  ["Läsa allowed_users", [false, false, true, true], (db) => db.from("allowed_users").select("email").limit(1).then(raderFinns)],
  ["Lägga till sig själv i allowed_users", [false, false, false, true], async (db) => {
    if (!process.env.JWT_ADMIN) return { ok: null, text: "Admininloggning krävs för säker städning" };
    const r = await db.from("allowed_users").insert({ email: `${ID}@exempel.invalid`, role: "montor" }).select("email");
    if (!r.error) kontrolleraStadning(await klient(process.env.JWT_ADMIN).from("allowed_users").delete().eq("email", `${ID}@exempel.invalid`).select("email"));
    return utfall(r);
  }],
  ["Lista protokoll", [false, false, true, true], (db) => db.from("protokoll").select("id").limit(1).then(raderFinns)],
  ["Ladda ner en ritning (Storage)", [false, false, true, true], async (db) => {
    const lista = await klient(process.env.JWT_ADMIN).storage.from("ritningar").list("", { limit: 1 });
    const mapp = lista.data?.[0]?.name;
    if (!mapp) return { ok: null, text: "inga ritningar att prova mot" };
    const filer = await klient(process.env.JWT_ADMIN).storage.from("ritningar").list(mapp, { limit: 1 });
    const fil = filer.data?.[0]?.name;
    if (!fil) return { ok: null, text: "inga ritningar att prova mot" };
    const r = await db.storage.from("ritningar").download(`${mapp}/${fil}`);
    return r.error ? bedomProvsvar(r) : { ok: !!r.data || null, text: "nedladdad" };
  }],
  ["Ladda upp en fil till ritningar", [false, false, true, true], async (db) => {
    if (!process.env.JWT_ADMIN) return { ok: null, text: "Admininloggning krävs för säker städning" };
    const sokvag = `${ID}/prov.txt`;
    const r = await db.storage.from("ritningar").upload(sokvag, new Blob(["prov"]), { upsert: false });
    if (!r.error) kontrolleraStadning(await klient(process.env.JWT_ADMIN).storage.from("ritningar").remove([sokvag]));
    return r.error ? bedomProvsvar(r) : { ok: true, text: "uppladdad" };
  }],
  ["Läsa godkannanden (F05)", [false, false, true, true], (db) => db.from("godkannanden").select("id").limit(1).then(raderFinns)],
  ["Skriva godkannanden direkt (ska alltid nekas)", [false, false, false, false], async (db) => {
    const r = await db.from("godkannanden").insert({ projekt_id: "__behorighetsprov_finns_inte__", typ: "grind", objekt_id: ID, varde: {}, kvitterad_av: "00000000-0000-0000-0000-000000000000", kvitterad_epost: "x" }).select("id");
    return utfall(r);
  }],
  ["RPC reservera_paminnelser (ska alltid nekas för klienter)", [false, false, false, false], async (db) => {
    const r = await db.rpc("reservera_paminnelser", { p_rader: [], p_las_sekunder: 1 });
    return bedomProvsvar(r, { tomtArTillatet: true });
  }],
];

function utfall(r) { return bedomProvsvar(r); }
function raderFinns(r) { return bedomProvsvar(r); }
function kandRad(r) { return bedomProvsvar(r, { tomtArNekat: true }); }

const datum = new Date().toISOString().slice(0, 16).replace("T", " ");
const ut = [`# Behörighetsprov ${datum}`, "", `Mål: ${URL}`, "", "| Prov | Roll | Förväntat | Utfall | Svar |", "| --- | --- | --- | --- | --- |"];
let avvikelser = 0;
let ejProvade = 0;
for (const [namn, forvantat, kor] of PROV) {
  for (let i = 0; i < ROLLER.length; i++) {
    const [roll, jwt] = ROLLER[i];
    if (i > 0 && !jwt) {
      ejProvade++;
      ut.push(`| ${namn} | ${roll} | ${forvantat[i] ? "tillåtet" : "nekat"} | ej provad | token saknas |`);
      continue;
    }
    let r;
    try {
      r = await kor(klient(jwt));
    } catch (e) {
      r = { ok: null, text: `Provet kunde inte köras: ${String(e?.message || e)}` };
    }
    if (r.ok === null) {
      ejProvade++;
      ut.push(`| ${namn} | ${roll} | ${forvantat[i] ? "tillåtet" : "nekat"} | ej verifierat | ${String(r.text).replace(/\|/g, "/")} |`);
      continue;
    }
    const stammer = r.ok === forvantat[i];
    if (!stammer) avvikelser++;
    ut.push(`| ${namn} | ${roll} | ${forvantat[i] ? "tillåtet" : "nekat"} | ${stammer ? "som väntat" : "**AVVIKER**"} (${r.ok ? "lyckades" : "nekades"}) | ${String(r.text).replace(/\|/g, "/")} |`);
  }
}
const slut = slutresultat(avvikelser, ejProvade);
ut.push("", slut.text, "", "Del 1 (grants, policyer, backup): lägg till utdata från supabase/prov/behorighetsprov.sql.", "");
console.log(ut.join("\n"));
process.exit(slut.kod);
