import { Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import logotyp from "../../assets/one-nordic-logo.png";
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
  footVanster: { position: "absolute", bottom: 17, left: 45, width: 300, fontSize: 7.5, color: F.dov },
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

  /* Sammanfattning */
  summaFet: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  summaText: { fontSize: 10.5, lineHeight: 1.5, color: F.text },
  sign: { flexDirection: "row", marginTop: 18 },
  signBox: { flex: 1, border: `0.8pt solid ${F.linje}`, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 },
  signRubrik: { fontFamily: RUBRIK, fontSize: 12.5, fontWeight: 700, color: F.djup, marginBottom: 6 },
  signRad: { height: 0.8, backgroundColor: F.text, marginTop: 26, marginBottom: 3 },
  signEtikett: { fontSize: 8.5, color: F.text },
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
  const ifyllda = sek.falt.length + (sek.tabeller ? sek.tabeller.length : sek.tabell ? 1 : 0);
  const alla = ifyllda + sek.tomma.length + (sek.tomTabell ? sek.tomTabell.split(", ").length : 0);
  return alla ? `${ifyllda} av ${alla} delar ifyllda` : "";
};

function Sidfot({ d, prefix = "Projektstart" }) {
  const p = d.projekt;
  const vanster = `${prefix} · ${p.namn || "Projekt utan namn"} · ${p.nr ? `Projektnr ${p.nr}` : "Projektnr ej skapat"} · Upprättad ${d.datum}`;
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

function Forsattsblad({ d, bilaga = false }) {
  const p = d.projekt;
  const ps = d.projektstart;
  const k = ps.kort;
  const stegKlara = ps.sektioner.filter((x) => x.besokt).length;
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

      <Text style={s.overrubrik}>{bilaga ? "BILAGA · PROJEKTSTART ENLIGT ONE-P" : "PROJEKTSTART OCH LÄGESBILD ENLIGT ONE-P"}</Text>
      <Text style={s.titel}>{p.namn || "Projekt utan namn"}</Text>

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
          <Text style={s.metaVarde}>{k.start || k.slut ? `${k.start || "?"} – ${k.slut || "?"}` : "Ej satt"}</Text>
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
          <Text style={s.metaEtikett}>Avropsbeslut</Text>
          <Text style={[s.metaVarde, { fontWeight: 700 }]}>{k.beslut || "Ej taget"}</Text>
        </View>
      </View>

      <View style={s.lage} wrap={false}>
        <View style={s.lageTopp}>
          <Text style={s.lageTitelRad}>Läget just nu{ps.sparad ? ` · senast sparad ${ps.sparad}` : ""}</Text>
          {ps.lage.skede ? <Text style={s.skede}>{ps.lage.skede.toUpperCase()}</Text> : null}
        </View>
        <Text style={s.lageRubrik}>Nuläge till ledningen</Text>
        <Text style={s.lageText}>{ps.lage.nulage || "Inget nuläge skrivet."}</Text>
        {ps.lage.beslut ? (
          <View style={s.beslut}>
            <Text style={[s.lageRubrik, { fontSize: 12 }]}>Beslut som behövs från ledningen</Text>
            <Text style={s.lageText}>{ps.lage.beslut}</Text>
          </View>
        ) : null}
      </View>

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
            {stegKlara} / {ps.sektioner.length}
          </Text>
          <Text style={s.tileEtikett}>Steg genomgångna</Text>
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
            <Text style={[s.td, { width: "17%" }]}>{x.fas}</Text>
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
                <Text style={{ fontSize: 9.5 }}>{stegLage(x) || (x.besokt ? "Genomgånget" : "Ej genomgånget")}</Text>
              )}
            </View>
          </View>
        );
      })}
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

/* En tabell: titel, kolumnrubriker och första raden hålls ihop. */
function tabellDelar(tb) {
  const summa = tb.vikter.reduce((a, b) => a + b, 0);
  const bredd = (i) => `${(tb.vikter[i] / summa) * 100}%`;
  const huvud = (
    <View wrap={false}>
      <Text style={s.tabellTitel}>{tb.titel}</Text>
      <View style={s.th}>
        {tb.kolumner.map((k, i) => (
          <Text key={k} style={[s.thText, { width: bredd(i) }]}>
            {k}
          </Text>
        ))}
      </View>
      <TabellRad r={tb.rader[0]} bredd={bredd} />
    </View>
  );
  const resten = tb.rader.slice(1).map((r, ri) => <TabellRad key={ri} r={r} bredd={bredd} />);
  return { huvud, resten };
}

function Steg({ sek, fasBand }) {
  const tabeller = (sek.tabeller || (sek.tabell ? [sek.tabell] : [])).map(tabellDelar);
  const [forstaTabell, ...ovrigaTabeller] = tabeller;
  const tomt = !sek.falt.length && !tabeller.length;
  const [forstaFalt, ...ovrigaFalt] = sek.falt;
  const forstaArRad = forstaFalt && !forstaFalt[2];

  return (
    <>
      <View>
        {/* Fasband, rubrik och första innehållet hålls ihop på samma sida. */}
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
            <View style={[s.piller, sek.besokt ? null : s.pillerGra]}>
              {sek.besokt ? <Bock farg={F.djup} storlek={6.5} /> : null}
              <Text style={[s.pillerText, { marginLeft: sek.besokt ? 3 : 0 }]}>{sek.besokt ? "Genomgånget" : "Ej genomgånget"}</Text>
            </View>
          </View>
          {forstaArRad ? (
            <View style={{ borderTop: `0.6pt solid ${F.linje}` }}>
              <Faltrad k={forstaFalt[0]} v={forstaFalt[1]} />
            </View>
          ) : null}
          {!forstaFalt && forstaTabell ? forstaTabell.huvud : null}
          {tomt ? <Text style={s.inget}>Inget ifyllt i det här steget ännu.</Text> : null}
        </View>

        {(forstaArRad ? ovrigaFalt : sek.falt).map(([k, v, stycken]) =>
          stycken ? <Faltblock key={k} k={k} stycken={stycken} /> : <Faltrad key={k} k={k} v={v} />,
        )}

        {forstaTabell ? (
          <View>
            {sek.falt.length ? forstaTabell.huvud : null}
            {forstaTabell.resten}
          </View>
        ) : null}
        {ovrigaTabeller.map((t, i) => (
          <View key={i}>
            {t.huvud}
            {t.resten}
          </View>
        ))}

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

/* ---------- Ledningsunderlag (skede Anbud) ----------
   Tre sidor beslutsunderlag före bilagan med hela projektstarten. Samma profil
   och samma byggstenar som projektstarten. */

const L = StyleSheet.create({
  titel: { fontFamily: RUBRIK, fontSize: 20, fontWeight: 700, color: F.djup, marginBottom: 5 },
  meta: { fontSize: 9, color: F.text, lineHeight: 1.4, marginBottom: 10 },
  h2: { fontFamily: RUBRIK, fontSize: 13, fontWeight: 700, color: F.djup, marginTop: 10, marginBottom: 5 },
  omslagTopp: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottom: `1.2pt solid ${F.bla}`,
    marginBottom: 14,
  },
  forslagRuta: { backgroundColor: F.djup, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 15, marginBottom: 4 },
  th: { flexDirection: "row", backgroundColor: F.ljus, borderBottom: `1pt solid ${F.bla}`, paddingVertical: 5 },
  thText: { fontSize: 8.5, fontWeight: 600, color: F.djup, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottom: `0.6pt solid ${F.linje}`, paddingVertical: 4.5 },
  forslagEtikett: { fontSize: 8.5, fontWeight: 700, color: F.himmel, letterSpacing: 1.2 },
  forslag: { fontSize: 10.5, fontWeight: 700, color: "#fff", lineHeight: 1.4 },
  senast: { fontSize: 9.5, color: "#fff", marginTop: 5 },
  td: { fontSize: 9, paddingHorizontal: 5, lineHeight: 1.35 },
  tdFet: { fontWeight: 700, color: F.djup },
  saknas: { color: F.rod, fontWeight: 700 },
  not: { fontSize: 8.5, color: F.dov, lineHeight: 1.4, marginTop: 5 },
  punkt: { flexDirection: "row", marginBottom: 4 },
  prick: { width: 4, height: 4, borderRadius: 2, backgroundColor: F.bla, marginTop: 5, marginRight: 7 },
  punktText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
  kontrollText: { fontSize: 9, lineHeight: 1.4, marginBottom: 2 },
  tidRad: { flexDirection: "row", borderTop: `2pt solid ${F.bla}`, marginTop: 2 },
  tidCell: { flex: 1, paddingTop: 5, paddingRight: 6 },
  tidDatum: { fontSize: 9, fontWeight: 700, color: F.djup },
  tidText: { fontSize: 9, lineHeight: 1.35, marginTop: 2 },
  riskVarde: { fontSize: 8.5, fontWeight: 700, color: "#fff", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1.5, alignSelf: "flex-start" },
  ruta: { border: `0.8pt solid ${F.linje}`, borderRadius: 7, paddingVertical: 10, paddingHorizontal: 12 },
  rutaRubrik: { fontFamily: RUBRIK, fontSize: 12, fontWeight: 700, color: F.djup, marginBottom: 6 },
  kontroll: { backgroundColor: "#fdecea", borderLeft: `2.5pt solid ${F.rod}`, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, marginTop: 10 },
  kontrollRubrik: { fontSize: 10, fontWeight: 700, color: F.rod, marginBottom: 4 },
  kpRad: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  kpTal: { fontFamily: RUBRIK, fontSize: 15, fontWeight: 700, width: 64 },
  summa: { flexDirection: "row", borderTop: `1pt solid ${F.djup}`, paddingVertical: 6 },
});

/** Tal med svensk decimalkomma. */
const fmt = (x, dec = 1) => {
  if (x === null || x === undefined) return "";
  const avr = Math.round(x * 10 ** dec) / 10 ** dec;
  return String(avr).replace(".", ",");
};

/** Belopp i MSEK med en decimal. */
const fmt1 = (x) => x.toFixed(1).replace(".", ",");

const riskFarg = (v) => (v >= 15 ? F.rod : v >= 8 ? F.orange : F.bla);

function Tabell({ kolumner, bredder, rader, hoger = [] }) {
  const stil = (i) => [L.td, { width: bredder[i], textAlign: hoger.includes(i) ? "right" : "left" }];
  return (
    <View>
      <View style={L.th} wrap={false}>
        {kolumner.map((k, i) => (
          <Text key={i} style={[L.thText, { width: bredder[i], textAlign: hoger.includes(i) ? "right" : "left" }]}>
            {k}
          </Text>
        ))}
      </View>
      {rader.map((r, ri) => (
        <View key={ri} style={L.tr} wrap={false}>
          {r.map((c, i) =>
            typeof c === "object" && c !== null && !Array.isArray(c) && c.el ? (
              <View key={i} style={{ width: bredder[i], paddingHorizontal: 5 }}>
                {c.el}
              </View>
            ) : (
              <Text key={i} style={[stil(i), c && c.stil ? c.stil : null]}>
                {c && c.text !== undefined ? c.text || "–" : c || "–"}
              </Text>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function Punkter({ stycken }) {
  return stycken.map((st, i) => (
    <View key={i} style={L.punkt} wrap={false}>
      <View style={L.prick} />
      <Text style={L.punktText}>
        {st.nyckel ? <Text style={s.nyckel}>{st.nyckel}: </Text> : null}
        {st.typ === "milstolpe" ? `${st.kod} ${st.namn}${st.text ? `: ${st.text}` : ""}` : st.text}
      </Text>
    </View>
  ));
}

function RiskVarde({ r }) {
  return <Text style={[L.riskVarde, { backgroundColor: riskFarg(r.varde) }]}>{`${r.s}×${r.k}=${r.varde}`}</Text>;
}

function Godkannande() {
  return (
    <View wrap={false}>
      <Text style={L.h2}>Godkännande</Text>
      <View style={s.sign}>
        {["Projektledare", "Intern beställare / styrgrupp"].map((t, i) => (
          <View style={[s.signBox, i ? { marginLeft: 16 } : null]} key={t}>
            <Text style={s.signRubrik}>{t}</Text>
            {["Signatur", "Namnförtydligande", "Datum"].map((e) => (
              <View key={e}>
                <View style={s.signRad} />
                <Text style={s.signEtikett}>{e}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={L.not}>Arbetsmaterial. Kontrollera kontraktsvillkor, betalplan och priser mot originalhandlingarna före användning.</Text>
    </View>
  );
}

function LedningSida1({ d, l }) {
  const p = d.projekt;
  const ps = d.projektstart;
  const k = ps.kort;
  const sc = l.scenarier;
  const ekoBredd = ["46%", ...sc.map(() => `${54 / sc.length}%`)];
  const ekoRader = l.ekonomi.map((e) => [
    e.etikett,
    ...e.varden.map((x) => (x === null ? { text: "saknas", stil: L.saknas } : e.procent ? `${fmt(x)} %` : e.tak ? `≤ ${fmt(x)}` : fmt1(x))),
  ]);
  return (
    <View>
      <View style={L.omslagTopp}>
        <View>
          <Image src={logotyp} style={s.logo} />
          <Text style={s.logoUnder}>one-nordic.se</Text>
        </View>
        <View style={s.toppHoger}>
          <Text style={s.toppHogerFet}>Ledningsunderlag · Anbud</Text>
          <Text style={s.toppHogerText}>Upprättad {d.datum}</Text>
          {d.skapadAv ? <Text style={s.toppHogerText}>{d.skapadAv}</Text> : null}
        </View>
      </View>

      <Text style={s.overrubrik}>BESLUTSUNDERLAG TILL LEDNINGEN · ANBUD</Text>
      <Text style={L.titel}>
        {p.namn || "Projekt utan namn"}
        {l.anbudsdatumText ? ` – anbud ${l.anbudsdatumText}` : ""}
      </Text>
      <Text style={L.meta}>
        {[
          k.kontraktsform && `${k.kontraktsform}${k.niva ? ` · ${k.niva}` : ""}`,
          p.bestallare && `Beställare ${p.bestallare}`,
          k.plats,
          p.nr ? `Projektnr ${p.nr}` : "Projektnr ej skapat",
        ]
          .filter(Boolean)
          .join(" · ")}
        {k.start || k.slut ? `\nPeriod ${k.start || "?"} – ${k.slut || "?"}` : ""}
      </Text>

      <View style={L.forslagRuta} wrap={false}>
        <View style={s.lageTopp}>
          <Text style={L.forslagEtikett}>FÖRSLAG</Text>
          <Text style={s.skede}>ANBUD</Text>
        </View>
        <Text style={L.forslag}>{l.forslag || "Inget förslag skrivet. Fyll i ”Förslag till ledningen” i steget Avrop och anbud."}</Text>
        {l.beslutSenast ? (
          <Text style={L.senast}>
            Beslut behövs senast {l.beslutSenast}
            {l.anbudsdatum ? `, anbudet lämnas ${l.anbudsdatum}` : ""}.
          </Text>
        ) : null}
      </View>

      {l.beslut.length ? (
        <View>
          <Text style={L.h2} minPresenceAhead={60}>
            Beslut som behövs från ledningen
          </Text>
          <Tabell
            kolumner={["#", "Beslut", "Förslag"]}
            bredder={["6%", "34%", "60%"]}
            rader={l.beslut.map((b, i) => [{ text: String(i + 1), stil: L.tdFet }, { text: b.beslut, stil: L.tdFet }, b.forslag])}
          />
        </View>
      ) : null}

      <View style={{ flexDirection: "row", marginTop: 4 }}>
        <View style={{ width: "52%", paddingRight: 10 }}>
          <Text style={L.h2}>Ekonomi</Text>
          <Tabell
            kolumner={["MSEK", ...sc.map((x) => (sc.length > 1 ? `${x.id}: ${x.namn}` : x.namn))]}
            bredder={ekoBredd}
            hoger={sc.map((_, i) => i + 1)}
            rader={ekoRader}
          />
          <Text style={L.not}>Belopp i MSEK. Garantier och vitestak räknas på anbudspriset.</Text>
        </View>
        <View style={{ width: "48%", paddingLeft: 10 }}>
          <Text style={L.h2}>Därför ska vi gå vidare</Text>
          {l.motivering.length ? <Punkter stycken={l.motivering} /> : <Text style={s.inget}>Ingen motivering skriven.</Text>}
        </View>
      </View>

      {l.tidslinje.length ? (
        <View wrap={false}>
          <Text style={L.h2}>Tidplan</Text>
          <View style={L.tidRad}>
            {l.tidslinje.map((t, i) => (
              <View key={i} style={L.tidCell}>
                <Text style={L.tidDatum}>{t.datum}</Text>
                <Text style={L.tidText}>{t.text}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {l.toppRisker.length ? (
        <View wrap={false}>
          <Text style={L.h2}>{l.toppRisker.length === 3 ? "Tre största riskerna" : "Största riskerna"}</Text>
          <Tabell
            kolumner={["Risk", "S×K", "Åtgärd"]}
            bredder={["36%", "13%", "51%"]}
            rader={l.toppRisker.map((r) => [{ text: r.titel, stil: L.tdFet }, { el: <RiskVarde r={r} /> }, r.atgard])}
          />
        </View>
      ) : null}
    </View>
  );
}

function LedningSida2({ l }) {
  const sc = l.scenarier;
  const harBelopp = sc.some((x) => x.pris !== null);
  const kolumner = ["#", "Milstolpe", "Utlösare", "Datum", "Andel", ...(harBelopp ? sc.map((x) => `${x.id}, MSEK`) : [])];
  const bredder = harBelopp ? ["6%", "20%", "30%", "13%", "9%", ...sc.map(() => `${22 / sc.length}%`)] : ["6%", "26%", "42%", "14%", "12%"];
  const hoger = [4, ...(harBelopp ? sc.map((_, i) => 5 + i) : [])];
  return (
    <View>
      <Text style={L.h2} minPresenceAhead={80}>
        Tidplan per fas
      </Text>
      {l.faser.length ? (
        <Tabell
          kolumner={["Fas", "Start", "Slut", "Kritisk"]}
          bredder={["55%", "17%", "17%", "11%"]}
          rader={l.faser.map((f) => [f.namn, f.start, f.slut, f.kritisk ? { text: "Ja", stil: L.saknas } : ""])}
        />
      ) : (
        <Text style={s.inget}>Inga faser ifyllda.</Text>
      )}

      <Text style={L.h2} minPresenceAhead={60}>
        Betalplan
      </Text>
      {l.milstolpar.length ? (
        <View>
          <Tabell
            kolumner={kolumner}
            bredder={bredder}
            hoger={hoger}
            rader={l.milstolpar.map((m) => [
              { text: m.kod, stil: L.tdFet },
              { text: m.namn, stil: { fontWeight: 600 } },
              m.utlosare,
              m.datum,
              m.andel === null ? { text: "saknas", stil: L.saknas } : `${fmt(m.andel)} %`,
              ...(harBelopp ? m.belopp.map((b) => (b === null ? "" : fmt1(b))) : []),
            ])}
          />
          {l.andelSumma !== null ? (
            <View style={L.summa} wrap={false}>
              <Text style={[L.td, L.tdFet, { width: bredder.slice(0, 4).reduce((a, b) => a + parseFloat(b), 0) + "%" }]}>Summa</Text>
              <Text style={[L.td, L.tdFet, { width: bredder[4], textAlign: "right" }, Math.abs(l.andelSumma - 100) > 0.01 ? L.saknas : null]}>
                {fmt(l.andelSumma)} %
              </Text>
              {harBelopp
                ? sc.map((x, i) => (
                    <Text key={x.id} style={[L.td, L.tdFet, { width: bredder[5 + i], textAlign: "right" }]}>
                      {x.pris === null ? "" : fmt1(l.milstolpar.reduce((a, m) => a + (m.belopp[i] || 0), 0))}
                    </Text>
                  ))
                : null}
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={s.inget}>Inga milstolpar med namn ifyllda.</Text>
      )}

      {l.kontroller.length ? (
        <View style={L.kontroll} wrap={false}>
          <Text style={L.kontrollRubrik}>Kontroll av underlaget</Text>
          {l.kontroller.map((k, i) => (
            <Text key={i} style={L.kontrollText}>
              • {k}
            </Text>
          ))}
        </View>
      ) : null}

      {l.kassaflode || l.bankgaranti || l.villkor.length ? (
        <View style={{ flexDirection: "row", marginTop: 14 }}>
          <View style={[L.ruta, { flex: 1, marginRight: 8 }]}>
            <Text style={L.rutaRubrik}>Kassaflöde</Text>
            {l.kassaflode || l.bankgaranti ? (
              <Punkter stycken={[l.kassaflode, l.bankgaranti && `Bankgaranti: ${l.bankgaranti}`].filter(Boolean).map((t) => ({ text: t }))} />
            ) : (
              <Text style={s.inget}>Ej beskrivet.</Text>
            )}
          </View>
          <View style={[L.ruta, { flex: 1, marginLeft: 8 }]}>
            <Text style={L.rutaRubrik}>Kontraktsvillkor</Text>
            {l.villkor.length ? <Punkter stycken={l.villkor.map(([k, t]) => ({ nyckel: k, text: t }))} /> : <Text style={s.inget}>Ej ifyllda.</Text>}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LedningSida3({ l }) {
  return (
    <View>
      <View style={{ flexDirection: "row", marginTop: 6 }} wrap={false}>
        <View style={{ width: "50%", paddingRight: 10 }}>
          <Text style={L.h2}>Organisation</Text>
          {l.organisation.length ? (
            <Tabell kolumner={["Roll", "Namn"]} bredder={["40%", "60%"]} rader={l.organisation.map(([r, n]) => [{ text: r, stil: { fontWeight: 600 } }, n])} />
          ) : (
            <Text style={s.inget}>Ingen organisation ifylld.</Text>
          )}
        </View>
        <View style={{ width: "50%", paddingLeft: 10 }}>
          <Text style={L.h2}>Läge i kontrollpunkterna</Text>
          {l.kpLage.map((g) => (
            <View key={g.id} style={L.kpRad}>
              <Text style={[L.kpTal, { color: g.klara === g.totalt ? F.djup : g.kritiskaKvar ? F.rod : F.bla }]}>
                {g.klara} / {g.totalt}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: 600, color: F.djup }}>{g.namn}</Text>
                <Text style={{ fontSize: 9, lineHeight: 1.35 }}>
                  Steg {g.steg.join(", ")}
                  {g.kritiskaKvar ? ` · ${g.kritiskaKvar} kritiska kvar` : ""}
                </Text>
              </View>
            </View>
          ))}
          <Text style={L.not}>Punkterna efter kontrakt och byggstart bockas av när anbudet är vunnet.</Text>
        </View>
      </View>

      <Text style={L.h2} minPresenceAhead={60}>
        Riskregister
      </Text>
      {l.risker.length ? (
        <Tabell
          kolumner={["Risk", "S×K", "Ägare", "Åtgärd"]}
          bredder={["29%", "11%", "21%", "39%"]}
          rader={l.risker.map((r) => [{ text: r.titel, stil: L.tdFet }, { el: <RiskVarde r={r} /> }, r.agare, r.atgard])}
        />
      ) : (
        <Text style={s.inget}>Inga risker ifyllda.</Text>
      )}

      <Text style={L.h2} minPresenceAhead={60}>
        Åtgärder före anbud{l.anbudsdatumText ? ` ${l.anbudsdatumText}` : ""}
      </Text>
      {l.atgarder.length ? (
        <Tabell
          kolumner={["Åtgärd", "Ansvar", "Klart"]}
          bredder={["60%", "24%", "16%"]}
          hoger={[2]}
          rader={l.atgarder.map((a) => [a.atgard, a.ansvar, a.klart])}
        />
      ) : (
        <Text style={s.inget}>Inga åtgärder ifyllda.</Text>
      )}

      <Godkannande />
    </View>
  );
}

export function ProjektstartPdf({ dokument: d }) {
  const p = d.projekt;
  const ps = d.projektstart;
  const l = ps.ledning;
  return (
    <Document title={`${l ? "Ledningsunderlag" : "Projektstart"} ${p.nr || ""} ${p.namn}`.trim()} author={d.skapadAv || "ONE Nordic AB"}>
      {l ? (
        <Page size="A4" style={s.page} wrap>
          <Sidfot d={d} prefix="Ledningsunderlag" />
          <LedningSida1 d={d} l={l} />
          <LedningSida2 l={l} />
          <LedningSida3 l={l} />
        </Page>
      ) : null}
      <Page size="A4" style={s.page} wrap>
        <Sidfot d={d} prefix={l ? "Bilaga projektstart" : "Projektstart"} />
        <Forsattsblad d={d} bilaga={!!l} />

        {ps.sektioner.map((sek, i) => (
          <Steg key={sek.id} sek={sek} fasBand={ps.sektioner[i - 1]?.fas !== sek.fas ? <FasBand text={sek.fas} /> : null} />
        ))}

        <Logg historik={ps.historik} />
        {ps.historik.length ? <View style={s.stegLuft} /> : null}

        <View wrap={false}>
          <Text style={[s.h2, { fontSize: 16 }]}>{l ? "Sammanfattning" : "Sammanfattning och godkännande"}</Text>
          <Text style={s.summaFet}>
            {ps.klara} av {ps.totalt} kontrollpunkter är avbockade. {ps.kritiskaOppna} av {ps.kritiskaTotalt} kritiska punkter är inte avbockade.
          </Text>
          <Text style={s.summaText}>
            Underlaget är ett arbetsmaterial. Kontrollera kontraktsvillkor, betalplan och priser mot originalhandlingarna före användning.
          </Text>
          {l ? null : (
            <View style={s.sign}>
              {["Projektledare", "Intern beställare / styrgrupp"].map((t, i) => (
                <View style={[s.signBox, i ? { marginLeft: 16 } : null]} key={t}>
                  <Text style={s.signRubrik}>{t}</Text>
                  {["Signatur", "Namnförtydligande", "Datum"].map((e) => (
                    <View key={e}>
                      <View style={s.signRad} />
                      <Text style={s.signEtikett}>{e}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
