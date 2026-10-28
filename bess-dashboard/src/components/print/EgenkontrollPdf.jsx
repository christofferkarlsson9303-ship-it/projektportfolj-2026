import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { kontrollNr, mallEtikett } from "../../data/kontrollnummer.js";
import logotyp from "../../assets/one-nordic-logo.png";
import regular from "../../assets/fonts/DejaVuSans.ttf?inline";
import bold from "../../assets/fonts/DejaVuSans-Bold.ttf?inline";
import { kontrollNamn, kontrollBrister, kontrollSummering, rapportStatus, ueUtskrift } from "../../lib/projektkontroll.js";
import { FALT_FORUTSATTNING } from "../../data/faltmaterial.js";
import { SA_HAR_GOR_DU, VID_FARA, arbetsSteg, momentBorja, momentRubrik, momentVar, sidfot } from "../../lib/arbetslista.js";

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
  indexRow: { border: "0.6pt solid #85959d", padding: 5, marginBottom: 4 },
  checkTitle: { fontWeight: 700, fontSize: 9, color: "#005f76", marginBottom: 4 },
  instruction: { fontSize: 8, lineHeight: 1.4, marginBottom: 5 },
  verification: { fontSize: 7.5, lineHeight: 1.4, padding: 5, backgroundColor: "#f3f5f6", marginBottom: 5 },
  reference: { fontSize: 7, color: "#435b67", marginBottom: 7 },
  result: { flexDirection: "row", justifyContent: "space-between", fontWeight: 700, marginBottom: 5 },
  writing: { marginTop: 5, minHeight: 17, borderBottom: "0.4pt solid #aab6bc", paddingBottom: 3 },
  foot: { position: "absolute", bottom: 18, left: 36, right: 36, fontSize: 6.5, color: "#435b67", flexDirection: "row", justifyContent: "space-between" },
});

/* Arbetslistan i klartext: större text, en mening per rad, ruta att kryssa
   och STOPP i ONE Röd. Samma regler som utskriften (lib/arbetslista.js). */
const a = StyleSheet.create({
  page: { fontFamily: "FieldSans", fontSize: 10.5, color: "#172d38", backgroundColor: "#fff", paddingTop: 96, paddingBottom: 46, paddingHorizontal: 36 },
  head: { position: "absolute", top: 22, left: 36, right: 36, borderBottom: "1.5pt solid #005f76", paddingBottom: 7 },
  title: { fontSize: 17, fontWeight: 700, color: "#005f76" },
  meta: { fontSize: 9.5, marginTop: 2 },
  moment: { fontSize: 14, fontWeight: 700, color: "#005f76", marginBottom: 4 },
  regler: { border: "1.5pt solid #005f76", borderRadius: 4, padding: 9, marginBottom: 12 },
  reglerRubrik: { fontSize: 12, fontWeight: 700, color: "#005f76", marginBottom: 4 },
  rad: { flexDirection: "row", marginBottom: 3 },
  nr: { width: 14, fontWeight: 700 },
  radText: { flex: 1, lineHeight: 1.2 },
  fara: { marginTop: 6, paddingLeft: 7, borderLeft: "3pt solid #ea5549", fontWeight: 700 },
  borja: { backgroundColor: "#f3f5f6", borderLeft: "2pt solid #005f76", padding: 6, marginBottom: 4, lineHeight: 1.2 },
  var: { marginBottom: 8 },
  steg: { border: "1pt solid #85959d", borderRadius: 4, padding: 9, marginBottom: 9 },
  stopp: { border: "2.5pt solid #ea5549", borderRadius: 4, padding: 9, marginBottom: 9 },
  stegHuvud: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  ruta: { width: 15, height: 15, border: "1.5pt solid #172d38", borderRadius: 2, marginRight: 8 },
  stegId: { fontSize: 8, fontWeight: 700, color: "#435b67", marginRight: 6 },
  stoppMarke: { fontSize: 9, fontWeight: 700, color: "#fff", backgroundColor: "#ea5549", paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 2, marginRight: 6 },
  stegTitel: { fontSize: 12, fontWeight: 700, flex: 1 },
  tank: { fontSize: 8.5, backgroundColor: "#f3f5f6", padding: 5, marginTop: 3, marginBottom: 3, lineHeight: 1.2 },
  vem: { fontSize: 9.5, marginTop: 3 },
  matt: { fontSize: 10.5, marginTop: 5, paddingTop: 4, fontWeight: 700 },
  sign: { fontSize: 9.5, marginTop: 7, paddingTop: 6, borderTop: "0.6pt dashed #85959d" },
  foot: { position: "absolute", bottom: 16, left: 36, right: 36, fontSize: 6.5, color: "#435b67", flexDirection: "row", justifyContent: "space-between" },
});

function ArbetsHeader({ d, moment }) {
  return <View fixed wrap={false} style={a.head}>
    <View style={s.top}><Image src={logotyp} style={s.logo} /><Text style={a.title}>Arbetslista – BESS</Text></View>
    <Text style={a.meta}>{d.projekt.nr || d.projekt.id} · {d.projekt.namn} · Datum: {d.datum}</Text>
    <Text style={a.meta}>Utförare: {moment?.utforare || d.utforare || "________________"}</Text>
  </View>;
}

function ArbetsFooter({ d }) {
  return <View fixed wrap={false} style={a.foot}>
    <Text style={{ flex: 1, marginRight: 12 }}>{sidfot(d)}</Text>
    <Text render={({ pageNumber, totalPages }) => `Sida ${pageNumber} av ${totalPages}`} />
  </View>;
}

function Numrerad({ rader }) {
  return rader.map((r, i) => <View key={i} style={a.rad} wrap={false}><Text style={a.nr}>{i + 1}.</Text><Text style={a.radText}>{r}</Text></View>);
}

function Regler({ d }) {
  return <View style={a.regler} wrap={false}>
    <Text style={a.reglerRubrik}>Så här gör du</Text>
    <Numrerad rader={SA_HAR_GOR_DU} />
    <Text style={a.fara}>{VID_FARA}</Text>
    {!d.komplett && d.moment.length > 1 ? <Text style={{ fontSize: 8.5, marginTop: 5 }}>Delurval: listan har bara en del av momenten.</Text> : null}
  </View>;
}

function Steg({ steg }) {
  const { p, titel, gor, tank, vem, matt, stopp } = steg;
  return <View style={stopp ? a.stopp : a.steg} wrap={false}>
    <View style={a.stegHuvud}>
      <View style={a.ruta} />
      <Text style={a.stegId}>{kontrollNr(p.id)}</Text>
      {stopp ? <Text style={a.stoppMarke}>STOPP</Text> : null}
      <Text style={a.stegTitel}>{titel}</Text>
    </View>
    {gor.length > 1 ? <Numrerad rader={gor} /> : <Text style={a.radText}>{gor[0]}</Text>}
    {tank ? <Text style={a.tank}>Tänk på: {tank}</Text> : null}
    {matt ? <Text style={a.matt}>Skriv: {matt}</Text> : null}
    {vem ? <Text style={a.vem}>Vem: {vem}</Text> : null}
    <Text style={a.sign}>{stopp ? "Arbetsledaren ger klartecken. " : "Klart. "}Datum: __________   Namn: ________________________</Text>
  </View>;
}

function ArbetslistaSidor({ d }) {
  const sidor = d.moment.map((m, i) => <Page key={`arbetslista-${m.id}`} size="A4" style={a.page} wrap>
    <ArbetsHeader d={d} moment={m} />
    {i === 0 && !d.uppgifter.length ? <Regler d={d} /> : null}
    <Text style={a.moment}>{momentRubrik(m)}</Text>
    {momentBorja(m) ? <Text style={a.borja}>Börja när: {momentBorja(m)}</Text> : null}
    {momentVar(m) ? <Text style={a.var}>Var: {momentVar(m)}{m.referens ? ` · Manual: ${m.referens}` : ""}</Text> : null}
    {arbetsSteg(m).map((st) => <Steg key={st.p.id} steg={st} />)}
    <ArbetsFooter d={d} />
  </Page>);
  if (d.uppgifter.length) sidor.unshift(<Page key="uppgifter" size="A4" style={a.page} wrap>
    <ArbetsHeader d={d} />
    <Regler d={d} />
    <Text style={a.moment}>Uppgifter i projektet</Text>
    {d.fran || d.till ? <Text style={a.var}>Period: {d.fran || "Alla datum"} – {d.till || "Alla datum"}</Text> : null}
    {d.uppgifter.map((p) => <View style={a.steg} wrap={false} key={p.id}>
      <View style={a.stegHuvud}><View style={a.ruta} /><Text style={a.stegTitel}>{p.titel}</Text></View>
      {p.instruktion && p.instruktion !== p.titel ? <Text style={a.radText}>{p.instruktion}</Text> : null}
      <Text style={a.vem}>Vem: {p.utforare || d.utforare || "________________"}{p.datum ? ` · Klart senast: ${p.datum}` : ""}{p.referens || d.ritning ? ` · Ritning: ${p.referens || d.ritning}` : ""}</Text>
      <Text style={a.sign}>Klart. Datum: __________   Namn: ________________________</Text>
    </View>)}
    <ArbetsFooter d={d} />
  </Page>);
  return sidor;
}

function Header({ d, titel, moment }) {
  return <View fixed wrap={false} style={s.head}>
    <View style={s.top}><Image src={logotyp} style={s.logo} /><Text style={s.title}>{titel}</Text></View>
    <Text style={s.meta}>{d.projekt.nr || d.projekt.id} · {d.projekt.namn} · {d.dokumentNr}</Text>
    <Text style={s.meta}>Datum: {d.datum} · Skapad av: {d.skapadAv || "________________"} · Mallrevision: {d.revision}</Text>
    <Text style={s.meta}>Enhet/serienummer: {d.mallpaket === "projekt" ? d.omfattning : d.enhet || "________________"} · Utförare: {moment?.utforare || d.utforare || "________________"}</Text>
    <Text style={s.meta}>Ritning/revision: {d.ritning || "________________"}</Text>
    {moment ? <Text style={s.moment}>{mallEtikett(moment)}: {moment.titel}</Text> : null}
  </View>;
}

function Footer({ d, arbetslista = false }) {
  return <View fixed wrap={false} style={s.foot}>
    <Text>{d.dokumentNr} · {arbetslista ? "Arbetslista – avprickning" : d.visaResultat ? "Registrerade resultat – separat underskrift" : "Blank checklista"}</Text>
    <Text render={({ pageNumber, totalPages }) => `Sida ${pageNumber} av ${totalPages}`} />
  </View>;
}

function Check({ p, d, arbetslista = false }) {
  return <View style={s.check} wrap={false}>
    <Text style={s.checkTitle}>{arbetslista ? "□ " : ""}{kontrollNr(p.id)} · {p.titel}</Text>
    <Text style={s.instruction}>{p.instruktion}</Text>
    {p.verifiering ? <Text style={s.verification}>Verifiering: {p.verifiering}</Text> : null}
    <Text style={s.reference}>Kompetens: {p.roll} · EPC: {p.epc.join(", ") || "ingen automatisk avbockning"}</Text>
    {arbetslista ? <Text style={s.writing}>Datum / signatur / notering:</Text> : d.visaResultat ? <>
      {ueUtskrift(p.kontroll) ? ueUtskrift(p.kontroll).map((t) => <Text key={t} style={s.instruction}>{t}</Text>) : <>
      <Text style={s.instruction}>Resultat: {kontrollNamn(p.kontroll?.resultat)} · Datum: {p.kontroll?.datum || "Ej angivet"}</Text>
      <Text style={s.instruction}>Kontrollant: {p.kontroll?.kontrollant || "Ej angiven"} · Kontrollerad mallrevision: {p.kontroll?.mallrevision || "Ej angiven"}</Text>
      <Text style={s.instruction}>Bevis/protokoll: {p.kontroll?.referens || "Ej angivet"}</Text>
      </>}
      <Text style={s.instruction}>Mätvärde / avvikelse / åtgärd / motivering: {p.kontroll?.notering || "—"}</Text>
      {kontrollBrister(p.kontroll, d.revision).length ? <Text style={s.verification}>Öppet: {kontrollBrister(p.kontroll, d.revision).join(" · ")}</Text> : null}
      <Text style={s.writing}>Signatur ONE: __________________</Text>
    </> : <>
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
      if (t === "arbetslista") return ArbetslistaSidor({ d });
      const arbetslista = false;
      const sidor = d.moment.map((m) => <Page key={`${t}-${m.id}`} size="A4" style={s.page} wrap>
        <Header d={d} titel={arbetslista ? "Arbetslista – BESS" : "Egenkontroll – BESS"} moment={m} />
        <Text style={s.source}>{d.kalla} {d.komplett ? "Hela valda mallpaketet." : "Delurval – kontrollera överlämningar och återstående arbete."}</Text>
        {d.oppnaBeslut?.length ? <Text style={s.source}>Öppna beslut: {d.oppnaBeslut.join(" ")}</Text> : null}
        <Text style={s.intro}>{d.inledning || FALT_FORUTSATTNING}</Text>
        {m.flode ? <Text style={s.source}>{m.flode}</Text> : null}
        <Text style={s.intro}>Utrustning: {m.utrustning}. Manual/provplan och revision: {m.referens || "EJ ANGIVEN – verifieras före utförande"}</Text>
        {m.punkter.map((p) => <Check key={p.id} p={p} d={d} arbetslista={arbetslista} />)}
        {!arbetslista ? <Text style={s.intro}>* Ej tillämplig motiveras i notering. En blankett per enhet/provomfattning.</Text> : null}
        <Footer d={d} arbetslista={arbetslista} />
      </Page>);
      if (!arbetslista && d.mallpaket === "projekt") sidor.unshift(<Page key="projekt-summary" size="A4" style={s.page} wrap>
        <Header d={d} titel="Projektets egenkontroll" />
        <Text style={s.checkTitle}>{rapportStatus(d)}</Text>
        <Text style={s.intro}>Beställare: {d.projekt.bestallare || "________________"}. Kontrollomfattning: {d.omfattning}. Kontrollplan/revision: {d.kontrollplan || "Ej angiven"}.</Text>
        <Text style={s.source}>{d.visaResultat ? `${d.sammanstallning.klara} kompletta av ${d.antal} kontroller. ${d.sammanstallning.oppna} öppna, varav ${d.sammanstallning.avvikelser} Ej OK.` : "Blank checklista – resultat fylls i vid verklig kontroll."} {d.komplett ? "Hela projektmallen är vald." : "Delurval av projektet."}</Text>
        <Text style={s.intro}>Kontrollera att alla berörda enheter/delområden ingår. Ej tillämplig ska motiveras. Protokoll/foton ska följa med eller finnas i slutdokumentationens index. Rapporten innebär ingen automatisk slutacceptans.</Text>
        {d.moment.map((m) => { const sum = kontrollSummering([m], d.revision); return <View key={m.id} style={s.indexRow} wrap={false}><Text>{m.nr}. {m.titel} · {sum.totalt} punkter{d.visaResultat ? ` · ${sum.klara} kompletta · ${sum.oppna} öppna` : ""}</Text></View>; })}
        <Text style={s.intro}>Bevis, mätvärden och öppna frågor redovisas per punkt. Sammanställd av: {d.skapadAv || "________________"} · {d.datum}.</Text>
        <Text style={s.writing}>Granskad av: __________________ · Datum: __________ · Signatur: __________</Text>
        <Text style={s.writing}>Beställarens mottagande / referens: __________________________________</Text>
        <Footer d={d} arbetslista={arbetslista} />
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
        <Footer d={d} arbetslista={arbetslista} />
      </Page>);
      return sidor;
    })}
  </Document>;
}
