/* Kalkyl, materiellista och kabellista ur en BESS-beredning.

   Kostnad per kod: timmar × timpris (KLG 1:26) × tidsfaktor; materiel, maskin och övrigt ur
   katalogen. Med `materielKalla: "beredning"` tas materielen från beredningens materiellista i
   stället för KLG:s schablon. Risk- och vinstkalkyl är påslag på grundkalkylen som i Guru. */

import { KATALOG, KLG_TIMPRIS, hittaKod } from "./katalog.js";
import { hittaArtikel } from "./materiel.js";
import { SERIER } from "./bibliotek.js";

/** Kostnad för `n` enheter av en katalogkod. */
export function kodKostnad(kod, n, { timpris = KLG_TIMPRIS, faktor = 1, materielKalla = "katalog", uePris = {} } = {}) {
  const c = typeof kod === "string" ? hittaKod(kod) : kod;
  if (!c) return null;
  const hb = (c.b || 0) * n * faktor, hm = (c.m || 0) * n * faktor, hx = (c.x || 0) * n * faktor;
  const harTim = c.b != null || c.m != null;
  const arbete = harTim ? ((c.b || 0) * timpris.bered + (c.m || 0) * timpris.mont) * n * faktor : (c.arb || 0) * n;
  const maskin = c.x != null ? (c.mk != null ? c.mk * (timpris.maskin / KLG_TIMPRIS.maskin) * n * faktor : hx * timpris.maskin) : (c.mk || 0) * n;
  const materiel = materielKalla === "beredning" ? 0 : (c.mat || 0) * n;
  const ovrigt = (c.ue ? Number(uePris[c.kod]) || 0 : c.ov || 0) * n;
  return { hb, hm, hx, arbete, materiel, maskin, ovrigt, summa: arbete + materiel + maskin + ovrigt, uePrisSaknas: c.ue && !Number(uePris[c.kod]) };
}

/** Summerade kalkylkoder över alla konstruktioner, sorterade på kod. */
export function summeraKoder(konstruktioner) {
  const m = new Map();
  for (const k of konstruktioner) for (const { kod, n } of k.k) m.set(kod, (m.get(kod) || 0) + n);
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "sv", { numeric: true })).map(([kod, n]) => ({ kod, n }));
}

/** Materiellista summerad per artikel. BL-artiklar markeras och prissätts inte. */
export function materiellista(konstruktioner) {
  const m = new Map();
  for (const k of konstruktioner) {
    for (const { art, n } of k.m) {
      const a = hittaArtikel(art);
      const r = m.get(art) || { art, ben: a?.ben || "Okänd artikel", enh: a?.enh || "", pris: a?.pris || 0, kalla: a?.kalla || "", lev: a?.lev || "", bl: !!a?.bl, n: 0, objekt: [] };
      r.n += n;
      r.objekt.push(k.ident);
      m.set(art, r);
    }
  }
  return [...m.values()];
}

/** Hela kalkylen: rader, summor per kostnadsslag, risk- och vinstkalkyl. */
export function beraknaKalkyl(konstruktioner, { timpris = KLG_TIMPRIS, faktor = 1, risk = 0, vinst = 0, materielKalla = "beredning", uePris = {} } = {}) {
  const rader = summeraKoder(konstruktioner).map(({ kod, n }) => {
    const c = hittaKod(kod);
    return { kod, n, c, v: c ? kodKostnad(c, n, { timpris, faktor, materielKalla, uePris }) : null };
  });
  const s = { hb: 0, hm: 0, hx: 0, arbete: 0, materiel: 0, maskin: 0, ovrigt: 0, summa: 0 };
  for (const r of rader) if (r.v) for (const k of Object.keys(s)) s[k] += r.v[k];
  let materielBeredning = 0;
  if (materielKalla === "beredning") {
    materielBeredning = materiellista(konstruktioner).filter((x) => !x.bl).reduce((a, x) => a + x.n * x.pris, 0);
    s.materiel += materielBeredning;
    s.summa += materielBeredning;
  }
  const riskkalkyl = s.summa * (1 + risk / 100);
  return {
    rader, summa: s, materielBeredning, riskkalkyl, vinstkalkyl: riskkalkyl * (1 + vinst / 100),
    saknasKod: rader.filter((r) => !r.c).map((r) => r.kod),
    uePrisSaknas: rader.filter((r) => r.v?.uePrisSaknas).map((r) => r.kod),
  };
}

/** Kabellista med löpnummer per serie. */
export function kabellista(konstruktioner) {
  const nasta = Object.fromEntries(Object.entries(SERIER).map(([k, s]) => [k, s.start]));
  const ut = [];
  for (const k of konstruktioner) {
    for (const c of k.c) {
      const nr = nasta[c.serie]++;
      const a = hittaArtikel(c.art);
      ut.push({ ...c, id: `${SERIER[c.serie].prefix}${nr}`, nr, ben: a?.ben || c.art, objekt: k.ident, totalt: c.antal * c.langd });
    }
  }
  return ut;
}

/** Kabellistan som semikolonseparerad text (Excel, svensk lokal). */
export function kabellistaCsv(rader) {
  const huvud = ["Kabel-ID", "Från", "Till", "Typ", "Kabel", "E-nr/Art", "Antal/parter", "Längd m", "Totalt m", "Förläggning"];
  const cell = (x) => `"${String(x ?? "").replace(/"/g, '""')}"`;
  return [huvud, ...rader.map((r) => [r.id, r.fran, r.till, r.typ, r.ben, r.art, r.antal, r.langd, r.totalt, r.forl])]
    .map((rad) => rad.map(cell).join(";"))
    .join("\r\n");
}

export { KATALOG };
