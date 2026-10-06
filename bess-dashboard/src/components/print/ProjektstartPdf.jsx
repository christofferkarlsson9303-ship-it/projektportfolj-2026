import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import logotyp from "../../assets/one-nordic-logo.png";

/* ONE-P-projektstarten som PDF: projektkort, sedan ett avsnitt per steg med
   ifyllda fält, tabeller och status på kontrollpunkterna. Färger och uppställning
   följer ONE Nordics profil (Blågrön rubrik, ONE Blå linje) och övriga PDF:er. */

const s = StyleSheet.create({
  page: { fontFamily: "FieldSans", fontSize: 9, paddingTop: 100, paddingBottom: 45, paddingHorizontal: 40, color: "#304047", backgroundColor: "#fff" },
  head: { position: "absolute", top: 28, left: 40, right: 40, borderBottom: "1.5pt solid #00b6de", paddingBottom: 8 },
  top: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  logo: { width: 65, height: 28, objectFit: "contain", objectPosition: "left", marginRight: 14 },
  title: { fontSize: 15, fontWeight: 700, color: "#005f76" },
  fas: { fontSize: 8, color: "#005f76", textTransform: "uppercase", letterSpacing: 1, marginTop: 14 },
  rubrik: { fontSize: 12, fontWeight: 700, color: "#005f76", marginBottom: 5, borderBottom: "0.5pt solid #bdd5d7", paddingBottom: 3 },
  row: { flexDirection: "row", border: "0.5pt solid #bdd5d7" },
  label: { width: "33%", padding: 5, fontWeight: 700, backgroundColor: "#f5f7f9" },
  value: { width: "67%", padding: 5 },
  tr: { flexDirection: "row", borderBottom: "0.5pt solid #bdd5d7", paddingVertical: 3 },
  th: { flexDirection: "row", borderBottom: "1pt solid #005f76", paddingVertical: 3, fontWeight: 700, backgroundColor: "#f5f7f9" },
  cell: { paddingHorizontal: 3 },
  kontroll: { marginTop: 5 },
  varning: { marginTop: 3, paddingLeft: 8, color: "#304047" },
  box: { border: "0.5pt solid #bdd5d7", padding: 8, marginTop: 10, lineHeight: 1.5 },
  sign: { marginTop: 20, flexDirection: "row", gap: 16 },
  signBox: { width: "50%", minHeight: 80, border: "0.5pt solid #bdd5d7", padding: 8 },
  bold: { fontWeight: 700, marginBottom: 4 },
  foot: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7 },
});

function Sektion({ sek }) {
  return (
    <View style={{ marginBottom: 6 }}>
      {sek.fas ? <Text style={s.fas}>{sek.fas}</Text> : null}
      <Text style={s.rubrik} minPresenceAhead={60}>{sek.titel}{sek.besokt ? "" : " (ej genomgånget)"}</Text>
      {sek.falt.map(([k, v]) => (
        <View key={k} style={s.row} wrap={false}>
          <Text style={s.label}>{k}</Text>
          <Text style={s.value}>{v}</Text>
        </View>
      ))}
      {sek.tabell ? (
        <View style={{ marginTop: 6 }}>
          <View style={s.th}>{sek.tabell.kolumner.map((k) => <Text key={k} style={[s.cell, { width: `${100 / sek.tabell.kolumner.length}%` }]}>{k}</Text>)}</View>
          {sek.tabell.rader.map((r, i) => (
            <View key={i} style={s.tr} wrap={false}>
              {r.map((c, j) => <Text key={j} style={[s.cell, { width: `${100 / r.length}%` }]}>{c || "—"}</Text>)}
            </View>
          ))}
        </View>
      ) : null}
      {sek.kontroll ? (
        <View style={s.kontroll}>
          <Text style={s.bold}>Kontrollpunkter: {sek.kontroll.klara} av {sek.kontroll.totalt} avbockade</Text>
          {sek.kontroll.kritiskaOppna.map((t) => <Text key={t} style={s.varning}>• Kritisk, ej avbockad: {t}</Text>)}
        </View>
      ) : null}
      {!sek.falt.length && !sek.tabell && !sek.kontroll ? <Text>Inget ifyllt.</Text> : null}
    </View>
  );
}

export function ProjektstartPdf({ dokument: d }) {
  const p = d.projekt;
  const ps = d.projektstart;
  return (
    <Document title={`Projektstart ${p.nr || ""} ${p.namn}`.trim()} author={d.skapadAv || "ONE Nordic AB"}>
      <Page size="A4" style={s.page} wrap>
        <View fixed style={s.head}>
          <View style={s.top}><Image src={logotyp} style={s.logo} /><Text style={s.title}>Projektstart enligt ONE-P</Text></View>
          <Text>{p.nr ? `${p.nr} · ` : ""}{p.namn || "Projekt utan namn"}</Text>
          <Text>Upprättad: {d.datum} · Skapad av: {d.skapadAv || "________________"}</Text>
        </View>
        {ps.sektioner.map((sek) => <Sektion key={sek.id} sek={sek} />)}
        <View style={s.box} wrap={false}>
          <Text style={s.bold}>Sammanfattning</Text>
          <Text>Kontrollpunkter avbockade: {ps.klara} av {ps.totalt}. Kritiska punkter som inte är avbockade: {ps.kritiskaOppna} av {ps.kritiskaTotalt}.</Text>
          <Text>Underlaget är ett arbetsmaterial. Kontrollera kontraktsvillkor, betalplan och priser mot originalhandlingarna före användning.</Text>
        </View>
        <View style={s.sign} wrap={false}>
          {["Projektledare", "Intern beställare / styrgrupp"].map((t) => (
            <View style={s.signBox} key={t}>
              <Text style={s.bold}>{t}</Text>
              <Text>Signatur: _______________________</Text>
              <Text>Namn: __________________________</Text>
              <Text>Datum: _________________________</Text>
            </View>
          ))}
        </View>
        <View fixed style={s.foot}>
          <Text>{p.nr || "Utkast"} · ONE Nordic AB · one-nordic.se</Text>
          <Text render={({ pageNumber, totalPages }) => `Sida ${pageNumber} av ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
