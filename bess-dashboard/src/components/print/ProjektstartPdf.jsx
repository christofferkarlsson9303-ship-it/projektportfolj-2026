import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import logotyp from "../../assets/one-nordic-logo.png";
import regular from "../../assets/fonts/DejaVuSans.ttf?inline";
import bold from "../../assets/fonts/DejaVuSans-Bold.ttf?inline";

/* ONE-P-projektstarten som PDF.
   Sida 1 är ett försättsblad: projektet, läget i siffror och alla steg i en
   översikt. Därefter kommer varje steg med nummer, ifyllda fält, tabell och
   samtliga kontrollpunkter med rutor (ifyllda när de är avbockade). Sist en
   sammanfattning med signaturer. Färger enligt ONE Nordics grafiska profil. */

Font.register({ family: "FieldSans", fonts: [{ src: regular }, { src: bold, fontWeight: 700 }] });
Font.registerHyphenationCallback((word) => [word]);

const F = {
  djup: "#005f76",
  bla: "#00b6de",
  turkos: "#3cb8ba",
  himmel: "#aee0e8",
  orange: "#f38d3d",
  rod: "#ea5549",
  ljus: "#f5f7f9",
  linje: "#bdd5d7",
  text: "#304047",
  dov: "#6b7c83",
};

const s = StyleSheet.create({
  /* Försättsblad */
  omslag: { fontFamily: "FieldSans", fontSize: 9, color: F.text, backgroundColor: "#fff", paddingBottom: 50 },
  band: { backgroundColor: F.djup, paddingHorizontal: 40, paddingTop: 32, paddingBottom: 26, color: "#fff" },
  logoRuta: { backgroundColor: "#fff", borderRadius: 4, paddingVertical: 5, paddingHorizontal: 8, alignSelf: "flex-start", marginBottom: 18 },
  logo: { width: 62, height: 24, objectFit: "contain" },
  overrubrik: { fontSize: 8, color: F.himmel, marginBottom: 4 },
  omslagTitel: { fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 4 },
  omslagUnder: { fontSize: 10, color: "#fff" },
  innehall: { paddingHorizontal: 40, paddingTop: 20 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  metaCell: { width: "33.33%", paddingRight: 10, marginBottom: 10 },
  metaEtikett: { fontSize: 7, color: F.dov, marginBottom: 2 },
  metaVarde: { fontSize: 10, fontWeight: 700, color: F.text },
  tiles: { flexDirection: "row", gap: 10, marginBottom: 18 },
  tile: { flex: 1, backgroundColor: F.ljus, borderRadius: 4, padding: 10, borderLeft: `3pt solid ${F.bla}` },
  tileVarde: { fontSize: 18, fontWeight: 700, color: F.djup },
  tileEtikett: { fontSize: 7.5, color: F.dov, marginTop: 2 },

  /* Innehållssidor */
  page: { fontFamily: "FieldSans", fontSize: 9, paddingTop: 74, paddingBottom: 50, paddingHorizontal: 40, color: F.text, backgroundColor: "#fff", lineHeight: 1.35 },
  head: { position: "absolute", top: 24, left: 40, right: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottom: `1.5pt solid ${F.bla}`, paddingBottom: 7 },
  headLogo: { width: 48, height: 19, objectFit: "contain" },
  headText: { fontSize: 8, color: F.dov, textAlign: "right" },
  headTitel: { fontSize: 9, fontWeight: 700, color: F.djup, textAlign: "right" },
  foot: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: F.dov, borderTop: `0.5pt solid ${F.linje}`, paddingTop: 5 },

  rubrikH2: { fontSize: 12, fontWeight: 700, color: F.djup, marginBottom: 8 },

  /* Översikt över stegen */
  ovTh: { flexDirection: "row", backgroundColor: F.djup, color: "#fff", fontWeight: 700, fontSize: 7.5, paddingVertical: 4 },
  ovTr: { flexDirection: "row", borderBottom: `0.5pt solid ${F.linje}`, paddingVertical: 4, alignItems: "center" },

  /* Fasband och steg */
  fasBand: { flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 10 },
  fasChip: { backgroundColor: F.djup, color: "#fff", fontSize: 7.5, fontWeight: 700, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3 },
  fasLinje: { flex: 1, borderBottom: `1pt solid ${F.himmel}`, marginLeft: 8 },
  steg: { marginBottom: 16 },
  stegHuvud: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  stegNr: { width: 20, height: 20, borderRadius: 10, backgroundColor: F.bla, color: "#fff", fontSize: 9, fontWeight: 700, textAlign: "center", paddingTop: 4, marginRight: 8 },
  stegTitel: { fontSize: 12.5, fontWeight: 700, color: F.djup },
  stegSammanfattning: { fontSize: 8, color: F.dov, marginTop: 1 },
  stegStatus: { fontSize: 7.5, color: F.dov, textAlign: "right", marginLeft: 8, marginTop: 3 },

  faltRad: { flexDirection: "row", borderBottom: `0.5pt solid ${F.linje}` },
  faltEtikett: { width: "30%", padding: 5, fontWeight: 700, backgroundColor: F.ljus, fontSize: 8.5 },
  faltVarde: { width: "70%", padding: 5 },
  tomma: { fontSize: 7.5, color: F.dov, marginTop: 4, fontStyle: "normal" },

  tabellTitel: { fontSize: 9, fontWeight: 700, color: F.djup, marginTop: 9, marginBottom: 3 },
  th: { flexDirection: "row", backgroundColor: F.ljus, borderBottom: `1pt solid ${F.djup}`, fontWeight: 700, fontSize: 7.5, paddingVertical: 4 },
  tr: { flexDirection: "row", borderBottom: `0.5pt solid ${F.linje}`, paddingVertical: 4 },
  cell: { paddingHorizontal: 4 },

  kpHuvud: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 4 },
  kpRubrik: { fontSize: 9, fontWeight: 700, color: F.djup, marginRight: 8 },
  kpAntal: { fontSize: 8, color: F.dov, marginLeft: 6 },
  grupp: { fontSize: 7.5, fontWeight: 700, color: F.dov, marginTop: 5, marginBottom: 2 },
  punkt: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 2 },
  ruta: { width: 8.5, height: 8.5, border: `0.8pt solid ${F.djup}`, borderRadius: 1.5, marginRight: 6, marginTop: 1.5, alignItems: "center", justifyContent: "center" },
  rutaKlar: { backgroundColor: F.turkos, borderColor: F.turkos },
  bock: { fontSize: 6.5, color: "#fff", fontWeight: 700, marginTop: -0.5 },
  punktText: { flex: 1, fontSize: 8.5 },
  punktKlar: { color: F.dov },
  kritisk: { fontSize: 6.5, fontWeight: 700, color: "#fff", backgroundColor: F.orange, borderRadius: 2, paddingHorizontal: 3, paddingVertical: 1, marginLeft: 6, marginTop: 1 },

  inget: { fontSize: 8.5, color: F.dov, padding: 6, backgroundColor: F.ljus, borderRadius: 3 },

  /* Sammanfattning och signaturer */
  box: { backgroundColor: F.ljus, borderLeft: `3pt solid ${F.djup}`, padding: 10, marginTop: 6, lineHeight: 1.5 },
  bold: { fontWeight: 700 },
  sign: { marginTop: 22, flexDirection: "row", gap: 16 },
  signBox: { flex: 1, border: `0.5pt solid ${F.linje}`, borderRadius: 4, padding: 10 },
  signRad: { borderBottom: `0.5pt solid ${F.text}`, marginTop: 22, marginBottom: 2 },
  signEtikett: { fontSize: 7, color: F.dov },
});

function Stapel({ varde, max, bredd = "100%", farg = F.turkos, hojd = 4 }) {
  const andel = max ? Math.min(1, varde / max) : 0;
  return (
    <View style={{ width: bredd, height: hojd, backgroundColor: F.linje, borderRadius: hojd / 2 }}>
      <View style={{ width: `${Math.round(andel * 100)}%`, height: hojd, backgroundColor: farg, borderRadius: hojd / 2 }} />
    </View>
  );
}

const stegLage = (sek) => {
  if (sek.kontroll) return `${sek.kontroll.klara} av ${sek.kontroll.totalt} kontrollpunkter`;
  const ifyllda = sek.falt.length + (sek.tabell ? 1 : 0);
  const alla = ifyllda + sek.tomma.length + (sek.tomTabell ? 1 : 0);
  return alla ? `${ifyllda} av ${alla} delar ifyllda` : "";
};

function Omslag({ d }) {
  const p = d.projekt;
  const ps = d.projektstart;
  const k = ps.kort;
  const stegKlara = ps.sektioner.filter((x) => x.besokt).length;
  const meta = [
    ["Projektnummer", p.nr || "Ej satt"],
    ["Beställare", p.bestallare || "Ej satt"],
    ["Plats / anläggning", k.plats || "Ej satt"],
    ["Period", k.start || k.slut ? `${k.start || "?"} – ${k.slut || "?"}` : "Ej satt"],
    ["Kontraktsform", [k.kontraktsform, k.niva].filter(Boolean).join(" · ") || "Ej satt"],
    ["Avropsbeslut", k.beslut || "Ej taget"],
  ];
  return (
    <Page size="A4" style={s.omslag}>
      <View style={s.band}>
        <View style={s.logoRuta}><Image src={logotyp} style={s.logo} /></View>
        <Text style={s.overrubrik}>PROJEKTSTART ENLIGT ONE-P</Text>
        <Text style={s.omslagTitel}>{p.namn || "Projekt utan namn"}</Text>
        <Text style={s.omslagUnder}>Upprättad {d.datum}{d.skapadAv ? ` av ${d.skapadAv}` : ""}</Text>
      </View>
      <View style={s.innehall}>
        <View style={s.metaGrid}>
          {meta.map(([e, v]) => (
            <View key={e} style={s.metaCell}>
              <Text style={s.metaEtikett}>{e}</Text>
              <Text style={s.metaVarde}>{v}</Text>
            </View>
          ))}
        </View>
        <View style={s.tiles}>
          <View style={s.tile}>
            <Text style={s.tileVarde}>{ps.klara} / {ps.totalt}</Text>
            <Text style={s.tileEtikett}>Kontrollpunkter avbockade</Text>
            <View style={{ marginTop: 6 }}><Stapel varde={ps.klara} max={ps.totalt} /></View>
          </View>
          <View style={[s.tile, { borderLeftColor: ps.kritiskaOppna ? F.orange : F.turkos }]}>
            <Text style={s.tileVarde}>{ps.kritiskaOppna}</Text>
            <Text style={s.tileEtikett}>Kritiska punkter kvar av {ps.kritiskaTotalt}</Text>
          </View>
          <View style={s.tile}>
            <Text style={s.tileVarde}>{stegKlara} / {ps.sektioner.length}</Text>
            <Text style={s.tileEtikett}>Steg genomgångna</Text>
          </View>
        </View>

        <Text style={s.rubrikH2}>Stegen i projektstarten</Text>
        <View style={s.ovTh}>
          <Text style={[s.cell, { width: "6%" }]}>#</Text>
          <Text style={[s.cell, { width: "18%" }]}>Fas</Text>
          <Text style={[s.cell, { width: "38%" }]}>Steg</Text>
          <Text style={[s.cell, { width: "38%" }]}>Läge</Text>
        </View>
        {ps.sektioner.map((x, i) => {
          const kp = x.kontroll;
          return (
            <View key={x.id} style={[s.ovTr, i % 2 ? { backgroundColor: F.ljus } : null]} wrap={false}>
              <Text style={[s.cell, { width: "6%", color: F.dov }]}>{x.nr}</Text>
              <Text style={[s.cell, { width: "18%", color: F.dov }]}>{x.fas}</Text>
              <Text style={[s.cell, { width: "38%", fontWeight: 700 }]}>{x.titel}</Text>
              <View style={[s.cell, { width: "38%", flexDirection: "row", alignItems: "center" }]}>
                {kp ? (
                  <>
                    <Stapel varde={kp.klara} max={kp.totalt} bredd={60} farg={kp.kritiskaOppna.length ? F.orange : F.turkos} />
                    <Text style={{ marginLeft: 6, fontSize: 7.5 }}>{kp.klara}/{kp.totalt}{kp.kritiskaOppna.length ? ` · ${kp.kritiskaOppna.length} kritiska kvar` : ""}</Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 7.5, color: F.dov }}>{stegLage(x) || (x.besokt ? "Genomgånget" : "Ej genomgånget")}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      <Sidfot d={d} />
    </Page>
  );
}

function Sidfot({ d }) {
  return (
    <View fixed style={s.foot}>
      <Text>{d.projekt.nr ? `${d.projekt.nr} · ` : ""}ONE Nordic AB · one-nordic.se · Arbetsmaterial</Text>
      <Text render={({ pageNumber, totalPages }) => `Sida ${pageNumber} av ${totalPages}`} />
    </View>
  );
}

function Punkt({ p }) {
  return (
    <View style={s.punkt} wrap={false}>
      <View style={[s.ruta, p.klar ? s.rutaKlar : null]}>{p.klar ? <Text style={s.bock}>✓</Text> : null}</View>
      <Text style={[s.punktText, p.klar ? s.punktKlar : null]}>{p.text}</Text>
      {p.kritisk && !p.klar ? <Text style={s.kritisk}>KRITISK</Text> : null}
    </View>
  );
}

/* Platt lista: rubrikerna kräver plats för några rader efter sig
   (minPresenceAhead), så att ingen rubrik blir ensam längst ned på en sida. */
function Kontrollpunkter({ k }) {
  return (
    <View>
      <View style={s.kpHuvud} wrap={false} minPresenceAhead={45}>
        <Text style={s.kpRubrik}>Kontrollpunkter</Text>
        <Stapel varde={k.klara} max={k.totalt} bredd={70} farg={k.kritiskaOppna.length ? F.orange : F.turkos} />
        <Text style={s.kpAntal}>{k.klara} av {k.totalt} avbockade</Text>
      </View>
      {k.grupper.flatMap((g) => [
        <Text key={`g-${g.rubrik}`} style={s.grupp} minPresenceAhead={30}>{g.rubrik}</Text>,
        ...g.punkter.map((p) => <Punkt key={`${g.rubrik}-${p.text}`} p={p} />),
      ])}
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

function TabellRad({ r, ri, bredd }) {
  return (
    <View style={[s.tr, ri % 2 ? { backgroundColor: F.ljus } : null]} wrap={false}>
      {r.map((c, j) => <Text key={j} style={[s.cell, { width: bredd(j) }]}>{c || "–"}</Text>)}
    </View>
  );
}

function Steg({ sek, fasBand }) {
  const summa = sek.tabell ? sek.tabell.vikter.reduce((a, b) => a + b, 0) : 1;
  const bredd = (i) => `${(sek.tabell.vikter[i] / summa) * 100}%`;
  const tomt = !sek.falt.length && !sek.tabell;
  const tabellHuvud = sek.tabell ? (
    <>
      <Text style={s.tabellTitel}>{sek.tabell.titel}</Text>
      <View style={s.th}>
        {sek.tabell.kolumner.map((k, i) => <Text key={k} style={[s.cell, { width: bredd(i) }]}>{k}</Text>)}
      </View>
      <TabellRad r={sek.tabell.rader[0]} ri={0} bredd={bredd} />
    </>
  ) : null;
  /* Fasband, stegrubrik och första innehållet hålls ihop på samma sida. */
  const forstaFalt = sek.falt.slice(0, 2);
  return (
    <View style={s.steg}>
      <View wrap={false}>
        {fasBand}
        <View style={s.stegHuvud}>
          <Text style={s.stegNr}>{sek.nr}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.stegTitel}>{sek.titel}</Text>
            {sek.sammanfattning ? <Text style={s.stegSammanfattning}>{sek.sammanfattning}</Text> : null}
          </View>
          <Text style={s.stegStatus}>{sek.besokt ? "Genomgånget" : "Ej genomgånget"}</Text>
        </View>
        {forstaFalt.length ? (
          <View style={{ borderTop: `0.5pt solid ${F.linje}` }}>
            {forstaFalt.map(([k, v]) => <Faltrad key={k} k={k} v={v} />)}
          </View>
        ) : sek.tabell ? tabellHuvud : null}
        {tomt ? <Text style={s.inget}>Inget ifyllt i det här steget ännu.</Text> : null}
      </View>

      {sek.falt.slice(2).map(([k, v]) => <Faltrad key={k} k={k} v={v} />)}

      {sek.tabell ? (
        <View>
          {forstaFalt.length ? <View wrap={false}>{tabellHuvud}</View> : null}
          {sek.tabell.rader.slice(1).map((r, ri) => <TabellRad key={ri} r={r} ri={ri + 1} bredd={bredd} />)}
        </View>
      ) : null}

      {!tomt && (sek.tomma.length || sek.tomTabell) ? (
        <Text style={s.tomma}>Ej ifyllt: {[...sek.tomma, sek.tomTabell].filter(Boolean).join(", ")}</Text>
      ) : null}

      {sek.kontroll ? <Kontrollpunkter k={sek.kontroll} /> : null}
    </View>
  );
}

export function ProjektstartPdf({ dokument: d }) {
  const p = d.projekt;
  const ps = d.projektstart;
  return (
    <Document title={`Projektstart ${p.nr || ""} ${p.namn}`.trim()} author={d.skapadAv || "ONE Nordic AB"}>
      <Omslag d={d} />
      <Page size="A4" style={s.page} wrap>
        <View fixed style={s.head}>
          <Image src={logotyp} style={s.headLogo} />
          <View>
            <Text style={s.headTitel}>Projektstart · {p.nr ? `${p.nr} ` : ""}{p.namn || "Projekt utan namn"}</Text>
            <Text style={s.headText}>Upprättad {d.datum}{d.skapadAv ? ` · ${d.skapadAv}` : ""}</Text>
          </View>
        </View>

        {ps.sektioner.map((sek, i) => (
          <Steg
            key={sek.id}
            sek={sek}
            fasBand={
              ps.sektioner[i - 1]?.fas !== sek.fas ? (
                <View style={s.fasBand}>
                  <Text style={s.fasChip}>{sek.fas.toUpperCase()}</Text>
                  <View style={s.fasLinje} />
                </View>
              ) : null
            }
          />
        ))}

        <View wrap={false}>
          <Text style={[s.rubrikH2, { marginTop: 8 }]}>Sammanfattning och godkännande</Text>
          <View style={s.box}>
            <Text>
              <Text style={s.bold}>{ps.klara} av {ps.totalt}</Text> kontrollpunkter är avbockade.{" "}
              <Text style={s.bold}>{ps.kritiskaOppna} av {ps.kritiskaTotalt}</Text> kritiska punkter är inte avbockade.
            </Text>
            <Text style={{ marginTop: 4, color: F.dov, fontSize: 8 }}>
              Underlaget är ett arbetsmaterial. Kontrollera kontraktsvillkor, betalplan och priser mot originalhandlingarna före användning.
            </Text>
          </View>
          <View style={s.sign}>
            {["Projektledare", "Intern beställare / styrgrupp"].map((t) => (
              <View style={s.signBox} key={t}>
                <Text style={[s.bold, { color: F.djup }]}>{t}</Text>
                {["Signatur", "Namnförtydligande", "Datum"].map((e) => (
                  <View key={e}>
                    <View style={s.signRad} />
                    <Text style={s.signEtikett}>{e}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
        <Sidfot d={d} />
      </Page>
    </Document>
  );
}
