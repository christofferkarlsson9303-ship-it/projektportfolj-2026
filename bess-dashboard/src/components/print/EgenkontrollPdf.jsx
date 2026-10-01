import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import logotyp from "../../assets/one-nordic-logo.png";
import regular from "../../assets/fonts/DejaVuSans.ttf?inline";
import bold from "../../assets/fonts/DejaVuSans-Bold.ttf?inline";
import { FALT_FORUTSATTNING } from "../../data/faltmaterial.js";

// Lokala typsnitt: svenska tecken, Ω, pilar och tomma rutor även utan nät.
Font.register({ family: "FieldSans", fonts: [{ src: regular }, { src: bold, fontWeight: 700 }] });
Font.registerHyphenationCallback((word) => [word]);
const s = StyleSheet.create({
  page: { fontFamily: "FieldSans", fontSize: 8, color: "#172d38", backgroundColor: "#fff", paddingTop: 138, paddingBottom: 42, paddingHorizontal: 36 },
  head: { position: "absolute", top: 24, left: 36, right: 36, borderBottom: "1.5pt solid #005f76", paddingBottom: 8 },
  top: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  logo: { width: 65, height: 28, objectFit: "contain", objectPosition: "left", marginRight: 12 },
  title: { fontSize: 15, fontWeight: 700, color: "#005f76" },
  meta: { fontSize: 7.5, marginBottom: 3 },
  moment: { fontSize: 9, fontWeight: 700, marginTop: 5 },
  intro: { fontSize: 8, marginBottom: 8, lineHeight: 1.4 },
  source: { fontSize: 8, padding: 7, backgroundColor: "#f3f5f6", borderLeft: "2pt solid #005f76", marginBottom: 8, lineHeight: 1.4 },
  check: { border: "0.6pt solid #85959d", padding: 8, marginBottom: 8 },
  checkTitle: { fontWeight: 700, fontSize: 9, color: "#005f76", marginBottom: 4 },
  instruction: { fontSize: 8, lineHeight: 1.4, marginBottom: 5 },
  verification: { fontSize: 7.5, lineHeight: 1.4, padding: 5, backgroundColor: "#f3f5f6", marginBottom: 5 },
  reference: { fontSize: 7, color: "#435b67", marginBottom: 7 },
  result: { flexDirection: "row", justifyContent: "space-between", fontWeight: 700, marginBottom: 5 },
  writing: { marginTop: 5, minHeight: 17, borderBottom: "0.4pt solid #aab6bc", paddingBottom: 3 },
  foot: { position: "absolute", bottom: 18, left: 36, right: 36, fontSize: 6.5, color: "#435b67", flexDirection: "row", justifyContent: "space-between" },
});

function Header({ d, titel, moment }) {
  return <View fixed style={s.head}>
    <View style={s.top}><Image src={logotyp} style={s.logo} /><Text style={s.title}>{titel}</Text></View>
    <Text style={s.meta}>{d.projekt.nr || d.projekt.id} · {d.projekt.namn} · {d.dokumentNr}</Text>
    <Text style={s.meta}>Datum: {d.datum} · Skapad av: {d.skapadAv || "________________"} · Mallrevision: {d.revision}</Text>
    <Text style={s.meta}>Enhet/serienummer: {d.enhet || "________________"} · Utförare: {moment?.utforare || d.utforare || "________________"}</Text>
    <Text style={s.meta}>Ritning/revision: {d.ritning || "________________"}</Text>
    {moment ? <Text style={s.moment}>Moment {moment.nr}: {moment.titel}</Text> : null}
  </View>;
}

function Footer({ d }) {
  return <View fixed style={s.foot}>
    <Text>{d.dokumentNr} · Blank kontroll – återrapporteras separat</Text>
    <Text render={({ pageNumber, totalPages }) => `Sida ${pageNumber} av ${totalPages}`} />
  </View>;
}

function Check({ p, arbetslista = false }) {
  return <View style={s.check} wrap={false}>
    <Text style={s.checkTitle}>{arbetslista ? "□ " : ""}{p.id} · {p.titel}</Text>
    <Text style={s.instruction}>{p.instruktion}</Text>
    {p.verifiering ? <Text style={s.verification}>Verifiering: {p.verifiering}</Text> : null}
    <Text style={s.reference}>Kompetens: {p.roll} · EPC: {p.epc.join(", ") || "Ny detaljpunkt i momentmallen"}</Text>
    {arbetslista ? <Text style={s.writing}>Datum / signatur / notering:</Text> : <>
      <View style={s.result}><Text>Resultat: □ OK    □ Ej OK    □ Ej tillämplig*</Text><Text>Datum: ______________</Text></View>
      <Text style={s.writing}>Mätvärde / Avvikelse / Notering:</Text>
      <View style={s.writing} />
      <Text style={s.writing}>Signatur: __________________    Protokoll/foto/referens: __________________</Text>
    </>}
  </View>;
}

export function EgenkontrollPdf({ dokument: d, typ = "egenkontroll" }) {
  const typer = typ === "paket" ? ["arbetslista", "egenkontroll"] : [typ];
  return <Document title={`${d.dokumentNr} – BESS fältmaterial`} author={d.skapadAv || "ONE Nordic AB"}>
    {typer.flatMap((t) => {
      const arbetslista = t === "arbetslista";
      const sidor = d.moment.map((m) => <Page key={`${t}-${m.id}`} size="A4" style={s.page} wrap>
        <Header d={d} titel={arbetslista ? "Arbetslista – BESS" : "Egenkontroll – BESS"} moment={m} />
        <Text style={s.source}>{d.kalla} {d.komplett ? "Hela valda mallpaketet." : "Delurval – kontrollera överlämningar och återstående arbete."}</Text>
        <Text style={s.intro}>{d.inledning || FALT_FORUTSATTNING}</Text>
        {m.flode ? <Text style={s.source}>{m.flode}</Text> : null}
        <Text style={s.intro}>Utrustning: {m.utrustning}. Manual/provplan och revision: {m.referens || "EJ ANGIVEN – verifieras före utförande"}</Text>
        {m.punkter.map((p) => <Check key={p.id} p={p} arbetslista={arbetslista} />)}
        {!arbetslista ? <Text style={s.intro}>* Ej tillämplig motiveras i notering. En blankett per enhet/provomfattning.</Text> : null}
        <Footer d={d} />
      </Page>);
      if (arbetslista && d.uppgifter.length) sidor.unshift(<Page key="uppgifter" size="A4" style={s.page} wrap>
        <Header d={d} titel="Arbetslista – projektuppgifter" />
        <Text style={s.intro}>Period: {d.fran || "Alla datum"} – {d.till || "Alla datum"}</Text>
        {d.uppgifter.map((p) => <View style={s.check} wrap={false} key={p.id}>
          <Text style={s.checkTitle}>□ {p.titel}</Text><Text style={s.instruction}>{p.instruktion}</Text>
          <Text style={s.reference}>Utförare: {p.utforare || d.utforare || "________________"} · Datum: {p.datum || "________________"}</Text>
          <Text style={s.reference}>Ritning/referens: {p.referens || d.ritning || "________________"}</Text>
          <Text style={s.writing}>Notering / Signatur:</Text>
        </View>)}
        <Footer d={d} />
      </Page>);
      return sidor;
    })}
  </Document>;
}
