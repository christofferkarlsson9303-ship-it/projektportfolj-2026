import { Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import logotyp from "../../assets/one-nordic-logo.png";
import { fmtKompakt, fmtProcent } from "../../lib/format.js";
import dejavu from "../../assets/fonts/DejaVuSans.ttf?inline";
import dejavuFet from "../../assets/fonts/DejaVuSans-Bold.ttf?inline";
import openSans from "../../assets/fonts/open-sans-latin-400-normal.woff?inline";
import openSansHalvfet from "../../assets/fonts/open-sans-latin-600-normal.woff?inline";
import openSansFet from "../../assets/fonts/open-sans-latin-700-normal.woff?inline";
import robotoSlab from "../../assets/fonts/roboto-slab-latin-400-normal.woff?inline";
import robotoSlabFet from "../../assets/fonts/roboto-slab-latin-700-normal.woff?inline";

/* ONE-P-projektstarten som PDF, enligt ONE Nordics grafiska profil.

   Ett sammanhängande flöde: försättsblad med projektuppgifter, lägesruta till
   ledningen, nyckeltal och översikt över stegen. Därefter varje steg med nummer,
   fält, tabeller och samtliga kontrollpunkter i två spalter. Sist
   uppdateringsloggen, sammanfattning och signaturfält.

   Typsnitt: Roboto Slab för rubriker och Open Sans för brödtext (profilens
   typsnitt, OFL-licens). DejaVu Sans tar de tecken som saknas i latin-uppsättningen,
   till exempel → och ≤.

   Två saker som får PDF:en att gå sönder i react-pdf, se ProjektstartPdf.test.js:
   - lineHeight på Page ärvs av de fasta elementen (sidfoten). Sätt radavstånd per text.
   - Sidfoten ska vara fristående fasta element utan ram och padding. */

Font.register({ family: "FieldSans", fonts: [{ src: dejavu }, { src: dejavuFet, fontWeight: 700 }] });
Font.register({
  family: "OpenSans",
  fonts: [{ src: openSans }, { src: openSansHalvfet, fontWeight: 600 }, { src: openSansFet, fontWeight: 700 }],
});
Font.register({ family: "RobotoSlab", fonts: [{ src: robotoSlab }, { src: robotoSlabFet, fontWeight: 700 }] });
Font.registerHyphenationCallback((word) => [word]);

const BROD = ["OpenSans", "FieldSans"];
const RUBRIK = ["RobotoSlab", "FieldSans"];

const F = {
  djup: "#005f76",
  bla: "#00b6de",
  himmel: "#aee0e8",
  himmelLjus: "#d9f1f5",
  rod: "#ea5549",
  orange: "#f38d3d",
  ljus: "#f5f7f9",
  linje: "#bdd5d7",
  text: "#304047",
  dov: "#5f6f76",
};

const s = StyleSheet.create({
  page: { fontFamily: BROD, fontSize: 10.5, color: F.text, backgroundColor: "#fff", paddingTop: 42, paddingBottom: 64, paddingHorizontal: 45 },

  /* Sidfot: fristående fasta element, ingen ram och ingen padding (se ovan). */
  footLinje: { position: "absolute", bottom: 46, left: 0, right: 0, height: 0.8, backgroundColor: F.bla },
  footVanster: { position: "absolute", bottom: 17, left: 45, width: 280, fontSize: 7.5, color: F.dov },
  footHoger: { position: "absolute", bottom: 28, right: 45, width: 200, fontSize: 7.5, color: F.djup, fontWeight: 700, textAlign: "right" },
  footSida: { position: "absolute", bottom: 17, right: 45, width: 200, fontSize: 7.5, color: F.dov, textAlign: "right" },

  /* Försättsblad */
  omslagTopp: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 16,
    borderBottom: `1.2pt solid ${F.bla}`,
    marginBottom: 22,
  },
  logo: { width: 76, height: 49, objectFit: "contain" },
  logoUnder: { fontSize: 9, color: F.djup, fontWeight: 600, marginTop: 4, marginLeft: 6 },
  toppHoger: { alignItems: "flex-end", marginTop: 4 },
  toppHogerFet: { fontSize: 10, fontWeight: 700, color: F.djup },
  toppHogerText: { fontSize: 10, color: F.text, marginTop: 2 },
  overrubrik: { fontSize: 9, fontWeight: 600, color: F.bla, letterSpacing: 1.6, marginBottom: 6 },
  titel: { fontFamily: RUBRIK, fontSize: 28, fontWeight: 700, color: F.djup, marginBottom: 16 },
  meta: { backgroundColor: F.ljus, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 17, flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  metaCell: { width: "33.33%", paddingRight: 10, marginBottom: 10 },
  metaCellBred: { width: "66.66%", paddingRight: 10, marginBottom: 10 },
  metaEtikett: { fontSize: 8.5, fontWeight: 600, color: F.djup, marginBottom: 3 },
  metaVarde: { fontSize: 10.5, lineHeight: 1.4 },

  /* Projektets nuvarande fas, överst på försättsbladet. */
  fasBox: { backgroundColor: F.djup, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 17, marginBottom: 14 },
  fasTopp: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  fasRubrik: { fontFamily: RUBRIK, fontSize: 15, fontWeight: 700, color: "#fff" },
  fasUnder: { fontSize: 9.5, color: F.himmel, marginTop: 2 },
  fasUtkast: { fontSize: 9.5, color: F.orange, marginTop: 3, fontFamily: RUBRIK, fontWeight: 700 },
  fasStatus: { fontSize: 8.5, fontWeight: 700, color: F.djup, backgroundColor: F.himmel, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8, letterSpacing: 0.8 },
  fasRad: { flexDirection: "row" },
  fasSegment: { flex: 1, marginRight: 4 },
  fasStapel: { height: 4, borderRadius: 2 },
  fasEtikett: { fontSize: 7.5, marginTop: 3 },
  lage: { backgroundColor: F.djup, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 17, marginBottom: 14 },
  lageTopp: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  lageTitelRad: { fontSize: 9.5, fontWeight: 600, color: "#fff" },
  skede: {
    fontSize: 8.5,
    fontWeight: 700,
    color: F.djup,
    backgroundColor: F.himmel,
    borderRadius: 4,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    letterSpacing: 1,
  },
  lageRubrik: { fontFamily: RUBRIK, fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 },
  lageText: { fontSize: 11, color: "#fff", lineHeight: 1.45 },
  beslut: { marginTop: 10, borderLeft: `2.5pt solid ${F.orange}`, paddingLeft: 9 },

  tiles: { flexDirection: "row", marginBottom: 20 },
  tile: { flex: 1, border: `0.8pt solid ${F.linje}`, borderRadius: 7, paddingVertical: 10, paddingHorizontal: 13 },
  tileTal: { fontFamily: BROD, fontSize: 21.5, fontWeight: 700 },
  tileEtikett: { fontSize: 9, color: F.text, marginTop: 3 },

  h2: { fontFamily: RUBRIK, fontSize: 17, fontWeight: 700, color: F.djup, marginBottom: 9 },

  /* Tabeller */
  th: { flexDirection: "row", backgroundColor: F.ljus, borderBottom: `1pt solid ${F.bla}`, paddingVertical: 7 },
  thText: { fontSize: 9.5, fontWeight: 600, color: F.djup, paddingHorizontal: 6 },
  tr: { flexDirection: "row", borderBottom: `0.6pt solid ${F.linje}`, paddingVertical: 7 },
  td: { fontSize: 9.5, paddingHorizontal: 6, lineHeight: 1.4 },

  /* Fasband och steg */
  fasBand: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 14 },
  fasText: { fontSize: 8.5, fontWeight: 700, color: F.bla, letterSpacing: 1.8, marginRight: 8 },
  fasLinje: { flex: 1, height: 0.6, backgroundColor: F.himmel },
  stegHuvud: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  stegNr: { width: 24, height: 24, borderRadius: 5, backgroundColor: F.bla, marginRight: 11, marginTop: 1, alignItems: "center", justifyContent: "center" },
  stegNrText: { fontSize: 12, fontWeight: 700, color: "#fff" },
  stegTitel: { fontFamily: RUBRIK, fontSize: 18, fontWeight: 700, color: F.djup },
  stegSammanfattning: { fontSize: 10, color: F.text, marginTop: 2 },
  piller: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: F.himmelLjus,
    borderRadius: 5,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    marginTop: 4,
  },
  pillerText: { fontSize: 8.5, fontWeight: 600, color: F.djup },
  pillerGra: { backgroundColor: F.ljus },
  /* Inget marginBottom på stegets block: då flyttar react-pdf hela steget till
     nästa sida i stället för att dela det. Luften läggs som ett eget block efter. */
  stegLuft: { height: 18 },

  faltRad: { flexDirection: "row", borderBottom: `0.6pt solid ${F.linje}`, paddingVertical: 7 },
  faltEtikett: { width: "26%", fontSize: 10.5, fontWeight: 600, color: F.djup, paddingRight: 8, lineHeight: 1.35 },
  faltVarde: { width: "74%", fontSize: 10.5, lineHeight: 1.45 },
  blockRubrik: { fontSize: 13, color: F.djup, marginTop: 10, marginBottom: 4 },
  stycke: { fontSize: 10.5, lineHeight: 1.5, marginBottom: 5 },
  nyckel: { fontWeight: 600, color: F.djup },
  milstolpe: { flexDirection: "row", backgroundColor: F.ljus, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 5 },
  milstolpeKod: { fontFamily: RUBRIK, fontSize: 12, fontWeight: 700, color: F.bla, width: 28 },
  milstolpeNamn: { fontSize: 10.5, fontWeight: 600, color: F.djup },
  milstolpeText: { fontSize: 10.5, lineHeight: 1.4, marginTop: 1 },
  tomma: { flexDirection: "row", border: `0.8pt dashed ${F.linje}`, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, marginTop: 9 },
  tommaEtikett: { fontSize: 10, fontWeight: 700, color: F.djup, marginRight: 5 },
  tommaText: { fontSize: 10, flex: 1, lineHeight: 1.35 },
  tabellTitel: { fontSize: 13, color: F.djup, marginTop: 10, marginBottom: 5 },
  inget: { fontSize: 10, color: F.dov, backgroundColor: F.ljus, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10 },

  /* Kontrollpunkter */
  kpHuvud: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: F.ljus,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginTop: 12,
    marginBottom: 8,
  },
  kpRubrik: { fontFamily: RUBRIK, fontSize: 12.5, fontWeight: 700, color: F.djup, marginRight: 10 },
  kpAntal: { fontSize: 10, fontWeight: 600, color: F.text, marginLeft: 10 },
  kritiskaKvar: {
    fontSize: 9,
    fontWeight: 700,
    color: "#fff",
    backgroundColor: F.rod,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  spalter: { flexDirection: "row" },
  spalt: { width: "50%" },
  grupp: {
    fontSize: 9,
    fontWeight: 700,
    color: F.djup,
    letterSpacing: 0.8,
    borderBottom: `0.6pt solid ${F.himmel}`,
    paddingBottom: 3,
    marginTop: 6,
    marginBottom: 5,
  },
  punkt: { flexDirection: "row", alignItems: "flex-start", marginBottom: 5 },
  ruta: {
    width: 9.5,
    height: 9.5,
    borderRadius: 2.5,
    border: `0.9pt solid ${F.bla}`,
    marginRight: 7,
    marginTop: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rutaKlar: { backgroundColor: F.bla },
  punktText: { fontSize: 10, lineHeight: 1.4 },
  kritiskOppen: { fontSize: 7.5, fontWeight: 700, color: "#fff", backgroundColor: F.rod, borderRadius: 2.5, paddingHorizontal: 3, letterSpacing: 0.5 },
  kritiskKlar: { fontSize: 7.5, fontWeight: 700, color: F.djup, backgroundColor: F.himmelLjus, borderRadius: 2.5, paddingHorizontal: 3, letterSpacing: 0.5 },

  /* Fas 1: sammanfattning för beslut på försättsbladet */
  ekoRad: { flexDirection: "row", marginBottom: 8 },
  ekoTile: { flex: 1, border: `0.8pt solid ${F.linje}`, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 11 },
  ekoEtikett: { fontSize: 8.5, fontWeight: 600, color: F.djup },
  ekoTal: { fontSize: 16, fontWeight: 700, color: F.text, marginTop: 3 },
  ekoSaknas: { fontSize: 11, fontWeight: 600, color: F.dov, marginTop: 6 },
  ekoUnder: { fontSize: 8.5, color: F.dov, marginTop: 2, lineHeight: 1.3 },
  rek: { border: `1pt solid ${F.bla}`, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 15, marginTop: 6, marginBottom: 14 },
  rekTopp: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  rekRubrik: { fontFamily: RUBRIK, fontSize: 13, fontWeight: 700, color: F.djup, flex: 1 },
  rekBeslut: { fontSize: 9, fontWeight: 700, color: "#fff", backgroundColor: F.djup, borderRadius: 4, paddingVertical: 2.5, paddingHorizontal: 8, letterSpacing: 0.6 },
  luckaRuta: { backgroundColor: "#fdf1e7", borderLeft: `2.5pt solid ${F.orange}`, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 12 },
  luckaText: { fontSize: 9.5, lineHeight: 1.4, color: F.text },
  beslutsruta: { border: `1pt solid ${F.djup}`, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, marginTop: 16 },
  kryssRad: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  kryss: { width: 11, height: 11, border: `0.9pt solid ${F.djup}`, borderRadius: 2, marginRight: 8 },
  kryssText: { fontSize: 10.5 },

  /* Sammanfattning */
  summaFet: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  summaText: { fontSize: 10.5, lineHeight: 1.5, color: F.text },
  sign: { flexDirection: "row", marginTop: 18 },
  signBox: { flex: 1, border: `0.8pt solid ${F.linje}`, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 },
  signRubrik: { fontFamily: RUBRIK, fontSize: 12.5, fontWeight: 700, color: F.djup, marginBottom: 6 },
  signRad: { height: 0.8, backgroundColor: F.text, marginTop: 26, marginBottom: 3 },
  signEtikett: { fontSize: 8.5, color: F.text },
  signVarde: { fontSize: 10.5, color: F.text, marginTop: 14 },
});

function Bock({ farg = "#fff", storlek = 7 }) {
  return (
    <Svg width={storlek} height={storlek} viewBox="0 0 10 10">
      <Path d="M2 5.3 L4.2 7.4 L8.2 2.8" stroke={farg} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Stapel({ varde, max, bredd = 60 }) {
  const andel = max ? Math.min(1, varde / max) : 0;
  return (
    <View style={{ width: bredd, height: 4, backgroundColor: F.linje, borderRadius: 2 }}>
      <View style={{ width: Math.max(andel * bredd, andel ? 4 : 0), height: 4, backgroundColor: F.bla, borderRadius: 2 }} />
    </View>
  );
}

const stegLage = (sek) => {
  const ifyllda = sek.falt.length + (sek.tabell ? 1 : 0);
  const alla = ifyllda + sek.tomma.length + (sek.tomTabell ? 1 : 0);
  return alla ? `${ifyllda} av ${alla} delar ifyllda` : "";
};

function Sidfot({ d }) {
  const p = d.projekt;
  const vanster = `Ledningsrapport · ${p.namn || "Projekt utan namn"} · ${p.nr ? `Projektnr ${p.nr}` : "Projektnr ej skapat"} · ${d.projektstart.lage.skede} · ${d.datum}`;
  return (
    <>
      <View fixed style={s.footLinje} />
      <Text fixed style={s.footVanster}>
        {vanster}
      </Text>
      <Text fixed style={s.footHoger}>
        ONE Nordic AB · one-nordic.se · Arbetsmaterial
      </Text>
      <Text fixed style={s.footSida} render={({ pageNumber, totalPages }) => `Sida ${pageNumber} av ${totalPages}`} />
    </>
  );
}

const LJUSTEXT = { gron: "Grön, enligt plan", gul: "Gul, avvikelse som hanteras i projektet", rod: "Röd, kräver hjälp eller beslut" };
/** Affärsläget anges av projektledaren, oberoende av metodens upplåsta faser. */
function FasRuta({ fas, lage }) {
  return (
    <View style={s.fasBox} wrap={false}>
      <Text style={[s.fasUnder, { letterSpacing: 1, marginBottom: 5 }]}>AKTUELLT PROJEKTSKEDE</Text>
      <Text style={[s.fasRubrik, { fontSize: 21 }]}>{lage.skede}</Text>
      <Text style={[s.fasUnder, { marginTop: 9 }]}>ONE-P: fas {fas.nr} av {fas.antal} - {fas.kort}</Text>
      {fas.nr > 1 ? <Text style={s.fasUnder}>{fas.utkast ? `Genomgång av fasen återstår: ${fas.kvar} obligatoriska punkter.` : "Fasens obligatoriska krav är uppfyllda."}</Text> : null}
      {fas.faser.filter((f) => f.nr === fas.nr && f.ljus).map((f) => (
        <Text key={f.nr} style={[s.fasUnder, { color: "#fff", marginTop: 6 }]}>Projektledarens bedömning: {LJUSTEXT[f.ljus]}{f.kommentar ? `. ${f.kommentar}` : ""}</Text>
      ))}
      {fas.nr === 1 ? <Text style={s.fasUnder}>Anbudsgenomgång. Uppstart och genomförandekontroller tillkommer efter vunnet anbud.</Text> : null}
      {!fas.faser.some((f) => f.nr === fas.nr && f.ljus) ? <Text style={s.fasUnder}>Projektledarens statusbedömning: ej angiven.</Text> : null}
    </View>
  );
}

const belopp = (n) => (n === null || n === undefined ? null : fmtKompakt(n));

function EkoTile({ etikett, varde, under, farg, style }) {
  return (
    <View style={[s.ekoTile, style]}>
      <Text style={s.ekoEtikett}>{etikett}</Text>
      {varde ? <Text style={[s.ekoTal, farg ? { color: farg } : null]}>{varde}</Text> : <Text style={s.ekoSaknas}>Ej angivet</Text>}
      {under ? <Text style={s.ekoUnder}>{under}</Text> : null}
    </View>
  );
}

/** Nyckeltalen ur kalkylen. Saknade belopp skrivs som "Ej angivet", aldrig som noll. */
function Ekonomi({ e }) {
  const tbFarg = e.tb === null ? null : e.tb < 0 ? F.rod : F.djup;
  const riskUnder = e.riskSumma !== null
    ? `Riskregistret: ${belopp(e.riskSumma)} i ${e.prissattaRisker} av ${e.antalRisker} risker`
    : e.antalRisker ? `Inga belopp i riskregistret (${e.antalRisker} risker)` : "Inga risker registrerade";
  return (
    <View wrap={false}>
      <Text style={[s.h2, { fontSize: 14, marginBottom: 6 }]}>Ekonomi</Text>
      <View style={s.ekoRad}>
        <EkoTile etikett="Anbudssumma" varde={belopp(e.summa)} />
        <EkoTile etikett="Kalkylerad kostnad" varde={belopp(e.kostnad)} style={{ marginHorizontal: 8 }} />
        <EkoTile etikett="Täckningsbidrag" varde={e.tb === null ? null : `${belopp(e.tb)} · ${fmtProcent(e.tbProcent)}`} farg={tbFarg} />
      </View>
      <View style={[s.ekoRad, { marginBottom: 4 }]}>
        <EkoTile etikett="Riskreserv" varde={belopp(e.riskreserv)} under={riskUnder} />
        <EkoTile etikett="Kassaflöde, lägsta punkt" varde={belopp(e.kassaLagst)} farg={e.kassaLagst < 0 ? F.rod : null} style={{ marginHorizontal: 8 }} />
        <EkoTile etikett="Underlag" varde={e.kalkylRev || null} under={e.kalkylRev ? null : "Ange kalkylens revision"} />
      </View>
    </View>
  );
}

function Rekommendation({ r }) {
  return (
    <View style={s.rek} wrap={false}>
      <View style={s.rekTopp}>
        <Text style={s.rekRubrik}>Projektledarens rekommendation</Text>
        <Text style={s.rekBeslut}>{(r.beslut || "Ej angiven").toUpperCase()}</Text>
      </View>
      <Text style={s.stycke}>{r.text || "Ingen rekommendation skriven (anbudsfråga 12)."}</Text>
      {r.motivering ? <Text style={[s.stycke, { marginBottom: 0 }]}><Text style={s.nyckel}>Motivering: </Text>{r.motivering}</Text> : null}
    </View>
  );
}

/** Det som saknas i underlaget, så att ledningen ser det innan beslutet. */
function Underlagsluckor({ f }) {
  if (!f.obesvarade && !f.kvar) return null;
  const delar = [
    f.obesvarade ? `${f.obesvarade} av ${f.fragorTotalt} anbudsfrågor obesvarade` : null,
    f.kvar ? `${f.kvar} obligatoriska punkter i fas 1 ej klara` : null,
  ].filter(Boolean);
  return (
    <View style={s.luckaRuta} wrap={false}>
      <Text style={[s.luckaText, { fontWeight: 700 }]}>Underlaget är inte komplett: {delar.join(", ")}.</Text>
      {f.saknas.length ? <Text style={s.luckaText}>Saknas: {f.saknas.slice(0, 6).join("; ")}{f.saknas.length > 6 ? ` med flera (${f.saknas.length} totalt)` : ""}.</Text> : null}
    </View>
  );
}

function ToppRisker({ risker }) {
  const B = ["52%", "12%", "18%", "18%"];
  return (
    <View wrap={false}>
      <Text style={[s.h2, { fontSize: 14, marginBottom: 6 }]}>Största riskerna</Text>
      {risker.length ? (
        <>
          <View style={s.th}>
            {["Risk", "S × K", "Ägare", "Reserverat"].map((t, i) => <Text key={t} style={[s.thText, { width: B[i] }]}>{t}</Text>)}
          </View>
          {risker.map((r) => (
            <View key={r.titel} style={s.tr}>
              <Text style={[s.td, { width: B[0] }]}>{r.titel}</Text>
              <Text style={[s.td, { width: B[1], fontWeight: 700, color: r.varde >= 15 ? F.rod : F.text }]}>{r.varde}</Text>
              <Text style={[s.td, { width: B[2] }]}>{r.agare || "–"}</Text>
              <Text style={[s.td, { width: B[3] }]}>{belopp(r.belopp) || "–"}</Text>
            </View>
          ))}
        </>
      ) : <Text style={s.inget}>Inga risker registrerade.</Text>}
    </View>
  );
}

/** Ledningens beslut i fas 1: tre alternativ, villkor och signatur. */
function LedningensBeslut() {
  return (
    <View style={s.beslutsruta} wrap={false}>
      <Text style={s.signRubrik}>Ledningens beslut</Text>
      {["Lämna anbud", "Lämna anbud med villkor", "Lämna inte anbud"].map((t) => (
        <View key={t} style={s.kryssRad}><View style={s.kryss} /><Text style={s.kryssText}>{t}</Text></View>
      ))}
      <Text style={[s.signEtikett, { marginTop: 6 }]}>Villkor och kommentar</Text>
      {[0, 1, 2].map((i) => <View key={i} style={[s.signRad, { marginTop: 18, marginBottom: 0 }]} />)}
      <View style={{ flexDirection: "row", marginTop: 4 }}>
        {["Signatur", "Namnförtydligande", "Datum"].map((e, i) => (
          <View key={e} style={{ flex: 1, marginLeft: i ? 12 : 0 }}>
            <View style={s.signRad} />
            <Text style={s.signEtikett}>{e}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Forsattsblad({ d }) {
  const p = d.projekt;
  const ps = d.projektstart;
  const k = ps.kort;
  /* Projektuppgifterna. I fas 1 står de efter sammanfattningen, annars direkt under fasrutan. */
  const meta = (
      <View style={s.meta} wrap={false}>
        <View style={s.metaCell}>
          <Text style={s.metaEtikett}>Projektnummer</Text>
          <Text style={s.metaVarde}>{p.nr || "Ej skapat"}</Text>
        </View>
        <View style={s.metaCell}>
          <Text style={s.metaEtikett}>Beställare</Text>
          <Text style={s.metaVarde}>{p.bestallare || "Ej satt"}</Text>
        </View>
        <View style={s.metaCell}>
          <Text style={s.metaEtikett}>Period</Text>
          <Text style={s.metaVarde}>{k.start || k.slut ? `${k.start || "Start ej angiven"} – ${k.slut || "Slut ej angivet"}` : "Ej satt"}</Text>
        </View>
        <View style={s.metaCellBred}>
          <Text style={s.metaEtikett}>Plats / anläggning</Text>
          <Text style={s.metaVarde}>{k.plats || "Ej satt"}</Text>
        </View>
        <View style={s.metaCell}>
          <Text style={s.metaEtikett}>Kontraktsform</Text>
          <Text style={s.metaVarde}>{[k.kontraktsform, k.niva].filter(Boolean).join(" · ") || "Ej satt"}</Text>
        </View>
        <View style={[s.metaCell, { marginBottom: 0 }]}>
          <Text style={s.metaEtikett}>{ps.fas.nr === 1 ? "PL:s rekommendation" : "Avropsbeslut"}</Text>
          <Text style={[s.metaVarde, { fontWeight: 700 }]}>{k.beslut || "Ej taget"}</Text>
        </View>
      </View>
  );
  return (
    <View>
      <View style={s.omslagTopp}>
        <View>
          <Image src={logotyp} style={s.logo} />
          <Text style={s.logoUnder}>one-nordic.se</Text>
        </View>
        <View style={s.toppHoger}>
          <Text style={s.toppHogerFet}>Arbetsmaterial</Text>
          <Text style={s.toppHogerText}>Upprättad {d.datum}</Text>
          {d.skapadAv ? <Text style={s.toppHogerText}>{d.skapadAv}</Text> : null}
        </View>
      </View>

      <Text style={s.overrubrik}>{ps.fas.nr === 1 ? "BESLUTSUNDERLAG ANBUD ENLIGT ONE-P" : "PROJEKTSTATUS OCH BESLUTSUNDERLAG"}</Text>
      <Text style={s.titel}>{p.namn || "Projekt utan namn"}</Text>

      <FasRuta fas={ps.fas} lage={ps.lage} />
      {ps.sammanfattning ? <Underlagsluckor f={ps.sammanfattning.fullstandighet} /> : null}
      {ps.sammanfattning ? <Ekonomi e={ps.sammanfattning.ekonomi} /> : null}
      {ps.sammanfattning ? <Rekommendation r={ps.sammanfattning.rekommendation} /> : null}

      {!ps.sammanfattning ? meta : null}
      <View style={s.lage} wrap={false}>
        <View style={s.lageTopp}>
          <Text style={s.lageTitelRad}>Läget just nu{ps.sparad ? ` · senast sparad ${ps.sparad}` : ""}</Text>
        </View>
        <Text style={s.lageRubrik}>Nuläge till ledningen</Text>
        <Text style={s.lageText}>{ps.lage.nulage || "Inget nuläge skrivet."}</Text>
        <View style={s.beslut}>
            <Text style={[s.lageRubrik, { fontSize: 12 }]}>Beslut som behövs från ledningen</Text>
            <Text style={s.lageText}>{ps.lage.beslut || "Inget beslutsbehov angivet."}</Text>
            {ps.lage.beslutSenast ? <Text style={[s.lageText, { marginTop: 4 }]}>Beslut senast: {ps.lage.beslutSenast}</Text> : null}
          </View>
        <View style={s.beslut}>
          <Text style={[s.lageRubrik, { fontSize: 12 }]}>Nästa steg och ansvarig</Text>
          <Text style={s.lageText}>{ps.lage.nastaSteg || "Ej angivet."}</Text>
        </View>
      </View>
      {ps.sammanfattning ? <ToppRisker risker={ps.sammanfattning.toppRisker} /> : null}
      {ps.sammanfattning ? <View style={{ marginTop: 14 }}>{meta}</View> : null}

      {ps.fas.nr > 1 ? <View break>
      <Text style={s.h2}>Bilaga - dokumentation och kontrollpunkter</Text>
      <Text style={s.stycke}>Omfattning: ONE-P fas 1{ps.fas.omfattar > 1 ? `-${ps.fas.omfattar}` : ""}. Avbockningarna visar dokumenterad egenkontroll, inte projektets färdigställandegrad. En öppnad sida innebär inte att innehållet är granskat eller godkänt.</Text>
      <View style={s.tiles} wrap={false}>
        <View style={s.tile}>
          <Text style={[s.tileTal, { color: F.bla }]}>
            {ps.klara} / {ps.totalt}
          </Text>
          <Text style={s.tileEtikett}>Kontrollpunkter avbockade</Text>
        </View>
        <View style={[s.tile, { marginHorizontal: 10 }]}>
          <Text style={[s.tileTal, { color: ps.kritiskaOppna ? F.rod : F.djup }]}>{ps.kritiskaOppna}</Text>
          <Text style={s.tileEtikett}>Kritiska punkter kvar av {ps.kritiskaTotalt}</Text>
        </View>
        <View style={s.tile}>
          <Text style={[s.tileTal, { color: F.djup }]}>
            {ps.sektioner.length}
          </Text>
          <Text style={s.tileEtikett}>Avsnitt i bilagan</Text>
        </View>
      </View>

      <View wrap={false}>
        <Text style={s.h2}>Stegen i projektstarten</Text>
        <View style={s.th}>
          <Text style={[s.thText, { width: "7%" }]}>#</Text>
          <Text style={[s.thText, { width: "17%" }]}>Fas</Text>
          <Text style={[s.thText, { width: "34%" }]}>Steg</Text>
          <Text style={[s.thText, { width: "42%" }]}>Läge</Text>
        </View>
      </View>
      {ps.sektioner.map((x) => {
        const kp = x.kontroll;
        return (
          <View key={x.id} style={[s.tr, { alignItems: "center" }]} wrap={false}>
            <Text style={[s.td, { width: "7%", color: F.bla, fontWeight: 700 }]}>{x.nr}</Text>
            <Text style={[s.td, { width: "17%" }]}>Fas {x.fasNr}</Text>
            <Text style={[s.td, { width: "34%", fontWeight: 600 }]}>{x.titel}</Text>
            <View style={{ width: "42%", paddingHorizontal: 6, flexDirection: "row", alignItems: "center" }}>
              {kp ? (
                <>
                  <Stapel varde={kp.klara} max={kp.totalt} />
                  <Text style={{ fontSize: 9.5, marginLeft: 8 }}>
                    {kp.klara}/{kp.totalt}
                    {kp.kritiskaOppna.length ? ` · ${kp.kritiskaOppna.length} kritiska kvar` : ""}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 9.5 }}>{stegLage(x) || (x.besokt ? "Öppnat i guiden" : "Ej öppnat i guiden")}</Text>
              )}
            </View>
          </View>
        );
      })}
      </View> : null}
    </View>
  );
}

function Faltrad({ k, v }) {
  return (
    <View style={s.faltRad} wrap={false}>
      <Text style={s.faltEtikett}>{k}</Text>
      <Text style={s.faltVarde}>{v}</Text>
    </View>
  );
}

function Stycken({ stycken }) {
  return stycken.map((st, i) =>
    st.typ === "milstolpe" ? (
      <View key={i} style={s.milstolpe} wrap={false}>
        <Text style={s.milstolpeKod}>{st.kod}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.milstolpeNamn}>
            {st.namn}
            {st.andel ? <Text style={{ fontWeight: 700 }}> - {st.andel}</Text> : null}
          </Text>
          {st.text ? <Text style={s.milstolpeText}>{st.text}</Text> : null}
        </View>
      </View>
    ) : (
      <Text key={i} style={s.stycke} orphans={2} widows={2}>
        {st.nyckel ? <Text style={s.nyckel}>{st.nyckel}: </Text> : null}
        {st.text}
      </Text>
    ),
  );
}

/* Ett fält som stycken: rubriken hålls ihop med första stycket. */
function Faltblock({ k, stycken }) {
  const [forsta, ...resten] = stycken;
  return (
    <View>
      <View wrap={false}>
        <Text style={s.blockRubrik}>{k}</Text>
        <Stycken stycken={[forsta]} />
      </View>
      <Stycken stycken={resten} />
    </View>
  );
}

function Punkt({ p }) {
  return (
    <View style={s.punkt} wrap={false}>
      <View style={[s.ruta, p.klar ? s.rutaKlar : null]}>{p.klar ? <Bock /> : null}</View>
      <Text style={[s.punktText, { flex: 1 }]}>
        {p.text}
        {p.kritisk ? " " : ""}
        {p.kritisk ? <Text style={p.klar ? s.kritiskKlar : s.kritiskOppen}> KRITISK </Text> : null}
      </Text>
    </View>
  );
}

/* Fördelar grupperna på två spalter i ordning, så att spalterna blir ungefär lika långa. */
function tvaSpalter(grupper) {
  const vikt = (g) => g.punkter.length + 2;
  const totalt = grupper.reduce((a, g) => a + vikt(g), 0);
  const vanster = [];
  let summa = 0;
  let i = 0;
  while (i < grupper.length && (summa + vikt(grupper[i]) / 2 <= totalt / 2 || !vanster.length)) {
    summa += vikt(grupper[i]);
    vanster.push(grupper[i]);
    i += 1;
  }
  return [vanster, grupper.slice(i)];
}

/* Punkterna i en spalt i ordning, med grupprubriken på gruppens första punkt.
   Spalterna är fria (inga låsta block), annars bryter react-pdf dem fel över en
   sida. Rubriken kräver plats för några rader efter sig (minPresenceAhead). */
function spaltrader(grupper) {
  const ut = [];
  for (const g of grupper) g.punkter.forEach((p, i) => ut.push({ rubrik: i === 0 ? g.rubrik : "", p }));
  return ut;
}

function Kontrollpunkter({ k }) {
  const [vanster, hoger] = tvaSpalter(k.grupper).map(spaltrader);
  return (
    <View>
      <View style={s.kpHuvud} wrap={false} minPresenceAhead={60}>
        <Text style={s.kpRubrik}>Kontrollpunkter</Text>
        <View style={{ flex: 1 }}>
          <View style={{ height: 4, backgroundColor: F.linje, borderRadius: 2 }}>
            <View style={{ width: `${k.totalt ? Math.round((k.klara / k.totalt) * 100) : 0}%`, height: 4, backgroundColor: F.bla, borderRadius: 2 }} />
          </View>
        </View>
        <Text style={s.kpAntal}>
          {k.klara} av {k.totalt} avbockade
        </Text>
        {k.kritiskaOppna.length ? <Text style={s.kritiskaKvar}>{k.kritiskaOppna.length} kritiska kvar</Text> : null}
      </View>
      <View style={s.spalter}>
        {[vanster, hoger].map((sp, si) => (
          <View key={si} style={[s.spalt, si ? { paddingLeft: 12 } : { paddingRight: 12 }]}>
            {sp.map((c, i) => (
              <View key={i} wrap={!c.rubrik}>
                {c.rubrik ? <Text style={s.grupp}>{c.rubrik.toUpperCase()}</Text> : null}
                <Punkt p={c.p} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function TabellRad({ r, bredd }) {
  return (
    <View style={s.tr} wrap={false}>
      {r.map((c, j) => (
        <Text key={j} style={[s.td, { width: bredd(j) }]}>
          {c || "–"}
        </Text>
      ))}
    </View>
  );
}

function Steg({ sek, fasBand }) {
  const summa = sek.tabell ? sek.tabell.vikter.reduce((a, b) => a + b, 0) : 1;
  const bredd = (i) => `${(sek.tabell.vikter[i] / summa) * 100}%`;
  const tomt = !sek.falt.length && !sek.tabell;
  const tabellHuvud = sek.tabell ? (
    <View wrap={false}>
      <Text style={s.tabellTitel}>{sek.tabell.titel}</Text>
      {(sek.id === "risker" || sek.id === "direktiv-2") ? <Text style={[s.stycke, { fontSize: 9 }]}>S = sannolikhet, K = konsekvens. Värde = S × K.</Text> : null}
      <View style={s.th}>
        {sek.tabell.kolumner.map((k, i) => (
          <Text key={k} style={[s.thText, { width: bredd(i) }]}>
            {k}
          </Text>
        ))}
      </View>
      <TabellRad r={sek.tabell.rader[0]} bredd={bredd} />
    </View>
  ) : null;
  const [forstaFalt, ...ovrigaFalt] = sek.falt;
  const forstaArRad = forstaFalt && !forstaFalt[2];
  const forstaArBlock = forstaFalt && !!forstaFalt[2];

  return (
    <>
      <View>
        {/* Fasband, rubrik och första innehållet hålls ihop på samma sida, även när
            första fältet är ett textblock (då följer blockets rubrik och första stycke med). */}
        <View wrap={false}>
          {fasBand}
          <View style={s.stegHuvud}>
            <View style={s.stegNr}>
              <Text style={s.stegNrText}>{sek.nr}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stegTitel}>{sek.titel}</Text>
              {sek.sammanfattning ? <Text style={s.stegSammanfattning}>{sek.sammanfattning}</Text> : null}
            </View>
            {!sek.id.startsWith("direktiv-") && !sek.id.startsWith("anbud-") ? <View style={[s.piller, s.pillerGra]}>
              <Text style={s.pillerText}>{sek.kontroll ? `${sek.kontroll.klara}/${sek.kontroll.totalt} avbockade` : stegLage(sek) || "Ej ifyllt"}</Text>
            </View> : null}
          </View>
          {forstaArRad ? (
            <View style={{ borderTop: `0.6pt solid ${F.linje}` }}>
              <Faltrad k={forstaFalt[0]} v={forstaFalt[1]} />
            </View>
          ) : null}
          {forstaArBlock ? (
            <>
              <Text style={s.blockRubrik}>{forstaFalt[0]}</Text>
              <Stycken stycken={forstaFalt[2].slice(0, 1)} />
            </>
          ) : null}
          {!forstaFalt && sek.tabell ? tabellHuvud : null}
          {tomt ? <Text style={s.inget}>Inget ifyllt i det här steget ännu.</Text> : null}
        </View>

        {forstaArBlock ? <Stycken stycken={forstaFalt[2].slice(1)} /> : null}
        {(forstaFalt ? ovrigaFalt : sek.falt).map(([k, v, stycken]) =>
          stycken ? <Faltblock key={k} k={k} stycken={stycken} /> : <Faltrad key={k} k={k} v={v} />,
        )}

        {sek.tabell ? (
          <View>
            {sek.falt.length ? tabellHuvud : null}
            {sek.tabell.rader.slice(1).map((r, ri) => (
              <TabellRad key={ri} r={r} bredd={bredd} />
            ))}
          </View>
        ) : null}

        {!tomt && (sek.tomma.length || sek.tomTabell) ? (
          <View style={s.tomma} wrap={false}>
            <Text style={s.tommaEtikett}>Ej ifyllt:</Text>
            <Text style={s.tommaText}>{[...sek.tomma, sek.tomTabell].filter(Boolean).join(", ")}</Text>
          </View>
        ) : null}

        {sek.kontroll ? <Kontrollpunkter k={sek.kontroll} /> : null}
      </View>
      <View style={s.stegLuft} />
    </>
  );
}

function FasBand({ text }) {
  return (
    <View style={s.fasBand}>
      <Text style={s.fasText}>{text.toUpperCase()}</Text>
      <View style={s.fasLinje} />
    </View>
  );
}

function Logg({ historik }) {
  if (!historik.length) return null;
  const B = ["15%", "17%", "12%", "20%", "36%"];
  return (
    <View>
      <View wrap={false}>
        <FasBand text="Logg och godkännande" />
        <Text style={s.h2}>Uppdateringar</Text>
        <View style={s.th}>
          {["Datum", "Av", "Skede", "Kontrollpunkter", "Nuläge"].map((t, i) => (
            <Text key={t} style={[s.thText, { width: B[i] }]}>
              {t}
            </Text>
          ))}
        </View>
      </View>
      {[...historik].reverse().map((h, i) => (
        <View key={`${h.datum}-${i}`} style={s.tr} wrap={false}>
          <Text style={[s.td, { width: B[0] }]}>{h.datum}</Text>
          <Text style={[s.td, { width: B[1] }]}>{h.av || "–"}</Text>
          <Text style={[s.td, { width: B[2] }]}>{h.skede || "–"}</Text>
          <Text style={[s.td, { width: B[3] }]}>
            {h.klara}/{h.totalt} · {h.kritiskaOppna} kritiska kvar
          </Text>
          <Text style={[s.td, { width: B[4] }]}>{h.nulage || "–"}</Text>
        </View>
      ))}
    </View>
  );
}

export function ProjektstartPdf({ dokument: d }) {
  const p = d.projekt;
  const ps = d.projektstart;
  return (
    <Document title={`Projektstart ${p.nr || ""} ${p.namn}`.trim()} author={d.skapadAv || "ONE Nordic AB"}>
      <Page size="A4" style={s.page} wrap>
        <Sidfot d={d} />
        <Forsattsblad d={d} />

        {(ps.anbud || []).map((sek, i) => <View key={sek.id} break={i === 0}><Steg sek={sek} fasBand={i === 0 ? <FasBand text="Del 1 · Anbud" /> : null} /></View>)}
        {(ps.direktiv || []).map((sek, i) => <View key={sek.id} break={i === 0}><Steg sek={{ ...sek, nr: (ps.anbud || []).length + sek.nr }} fasBand={i === 0 ? <FasBand text="Del 2 · Planering – projektdirektiv" /> : null} /></View>)}
        {ps.sektioner.filter((sek) => sek.fasNr > 1).map((sek, i, lista) => (
          <View key={sek.id} break><Steg sek={sek} fasBand={lista[i - 1]?.fas !== sek.fas ? <FasBand text={`Fas ${sek.fasNr} av ${ps.fas.antal} · ${sek.fasTitel}`} /> : null} /></View>
        ))}

        <Logg historik={ps.historik} />
        {ps.historik.length ? <View style={s.stegLuft} /> : null}

        <View break wrap={false}>
          <Text style={[s.h2, { fontSize: 16 }]}>{ps.fas.nr === 1 ? "Beslut och signering" : "Granskning och godkännande"}</Text>
          <Text style={s.summaFet}>
            Aktuellt projektskede: {ps.lage.skede}. Rapporten omfattar projektdirektivet{ps.fas.nr > 1 ? ` och upplåsta faser till och med fas ${ps.fas.nr} (${ps.fas.kort})` : " inför anbudsgenomgång"}. {ps.fas.nr === 1 ? `Anbudsutfall: ${ps.anbudsutfall}. Ledningen tar ställning till om anbudet ska lämnas in. Ett godkänt beslutsunderlag innebär inte vunnet anbud eller tillstånd att starta genomförandet.` : `${ps.klara} av ${ps.totalt} kontrollpunkter är avbockade.`}
          </Text>
          <Text style={s.summaText}>
            Underlaget är ett arbetsmaterial. Kontrollera kontraktsvillkor, betalplan och priser mot originalhandlingarna före användning.
          </Text>
          {ps.fas.nr === 1 ? <LedningensBeslut /> : null}
          {ps.fas.nr === 1 ? <Text style={[s.signRubrik, { marginTop: 16, marginBottom: 0 }]}>Underlaget upprättat av</Text> : null}
          <View style={[s.sign, ps.fas.nr === 1 ? { marginTop: 8 } : null]}>
            {(ps.signering || [{ roll: "Intern beställare" }, { roll: "Projektledare" }]).map((sg, i) => (
              <View style={[s.signBox, i ? { marginLeft: 16 } : null]} key={sg.roll}>
                <Text style={s.signRubrik}>{sg.roll}</Text>
                {[["Signatur", ""], ["Namnförtydligande", sg.namn], ["Datum", sg.datum]].map(([e, varde]) => (
                  <View key={e}>
                    {varde ? <Text style={s.signVarde}>{varde}</Text> : null}
                    <View style={[s.signRad, varde ? { marginTop: 2 } : null]} />
                    <Text style={s.signEtikett}>{e}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}

