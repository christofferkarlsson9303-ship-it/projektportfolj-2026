import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import logotyp from "../../assets/one-nordic-logo.png";
import { ATA_ART, ATA_KLASS, ORSAKER, PRISGRUND } from "../../data/konstanter.js";
import { fmtSEK, fmtTal } from "../../lib/format.js";
import { MOMS_PROCENT, radFaktor, radSumma } from "../../lib/atakalkyl.js";

const TITLAR = { underrattelse: "Underrättelse om ÄTA-arbete", pris: "Begäran om prisgodkännande", underlag: "ÄTA-underlag", avi: "Avisering av ÄTA-arbete" };
const s = StyleSheet.create({
  page: { fontFamily: "FieldSans", fontSize: 9, paddingTop: 112, paddingBottom: 45, paddingHorizontal: 40, color: "#172d38", backgroundColor: "#fff" },
  head: { position: "absolute", top: 28, left: 40, right: 40, borderBottom: "1.5pt solid #005f76", paddingBottom: 8 },
  top: { flexDirection: "row", alignItems: "center", marginBottom: 7 }, logo: { width: 65, height: 28, objectFit: "contain", objectPosition: "left", marginRight: 14 },
  title: { fontSize: 14, fontWeight: 700, color: "#005f76" },
  row: { flexDirection: "row", border: "0.5pt solid #85959d" }, label: { width: "33%", padding: 6, fontWeight: 700, backgroundColor: "#f3f5f6" }, value: { width: "67%", padding: 6 },
  box: { fontSize: 9, border: "0.5pt solid #85959d", padding: 9, marginTop: 12, lineHeight: 1.5 },
  bold: { fontWeight: 700, marginBottom: 5 },
  sign: { marginTop: 25, flexDirection: "row", gap: 16 }, signBox: { width: "50%", minHeight: 86, border: "0.5pt solid #85959d", padding: 8 },
  foot: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7 },
  krad: { flexDirection: "row", borderBottom: "0.5pt solid #85959d", paddingVertical: 4 },
  khuvud: { flexDirection: "row", borderBottom: "1pt solid #005f76", paddingVertical: 4, fontWeight: 700, backgroundColor: "#f3f5f6" },
  kcell: { paddingHorizontal: 3 }, knum: { paddingHorizontal: 3, textAlign: "right" },
});

/* Kolumnbredder i avins kalkyltabell (summerar till 100 %). */
const KB = ["11%", "25%", "16%", "10%", "10%", "7%", "8%", "13%"];

function Kalkyltabell({ rader, summor }) {
  const dec = (n) => String(Math.round((Number(n) || 0) * 100) / 100).replace(".", ",");
  const rubriker = ["Datum", "Beskrivning", "Resurs", "Antal", "Á-pris", "ÖT %", "Påslag %", "Summa"];
  return <View style={{ marginTop: 12 }}>
    <View style={s.khuvud} fixed>{rubriker.map((r, i) => <Text key={r} style={[i >= 3 ? s.knum : s.kcell, { width: KB[i] }]}>{r}</Text>)}</View>
    {rader.map((r) => <View key={r.id} style={s.krad} wrap={false}>
      {[r.datum || "—", r.beskrivning || "—", r.resurs || "—", `${fmtTal(Number(r.antal) || 0, Number.isInteger(Number(r.antal) || 0) ? 0 : 2)} ${r.enhet || ""}`, fmtSEK(r.apris), dec((radFaktor(r) - 1) * 100), dec(r.paslag), fmtSEK(Math.round(radSumma(r)))]
        .map((v, i) => <Text key={i} style={[i >= 3 ? s.knum : s.kcell, { width: KB[i] }]}>{v}</Text>)}
    </View>)}
    {[["Netto", fmtSEK(summor.netto)], [`Moms ${MOMS_PROCENT} %`, fmtSEK(summor.moms)], ["Att betala", fmtSEK(summor.attBetala)]].map(([k, v]) =>
      <View key={k} style={s.krad} wrap={false}><Text style={[s.knum, { width: "87%", fontWeight: 700 }]}>{k}</Text><Text style={[s.knum, { width: "13%", fontWeight: 700 }]}>{v}</Text></View>)}
  </View>;
}

export function AtaPdf({ dokument: d, typ }) {
  const u = d.ata, p = d.projekt;
  const klass = ATA_KLASS.find(([k]) => k === u.klass)?.[1] || "—";
  const pris = PRISGRUND.find(([k]) => k === u.prisgrund)?.[1] || "—";
  const orsak = ORSAKER.find(([k]) => k === u.orsak)?.[1] || "Ej angiven";
  const f = typ === "avi" ? [
    ["UR/ÄTA-nummer", u.nr], ["Projekt / AO", `${p.nr || p.id} · ${p.namn}`],
    ["Beställare", p.bestallare], ["Entreprenör", "ONE Nordic AB"], ["Orsak", orsak],
  ] : [
    ["UR/ÄTA-nummer", u.nr], ["Projekt / AO", `${p.nr || p.id} · ${p.namn}`],
    ["AffärsID", p.affarsId || p.nr], ["Beställare", p.bestallare],
    ["Art", ATA_ART.find(([k]) => k === u.art)?.[1] || "—"], ["Behandlas som", klass], ["Orsak", orsak], ["Status", u.status], ["Prisgrund", pris], ["Belopp", fmtSEK(u.belopp)],
    ["Händelsedatum", u.handelseDatum], ["Underrättelse avsänd", u.underrattelseDatum],
    ["Pris godkänt", u.godkantDatum], ["Fakturerat", u.fakturaDatum],
  ];
  return <Document title={`${u.nr} – ${TITLAR[typ]}`} author={d.skapadAv || "ONE Nordic AB"}>
    <Page size="A4" style={s.page} wrap>
      <View fixed style={s.head}>
        <View style={s.top}><Image src={logotyp} style={s.logo} /><Text style={s.title}>{TITLAR[typ]}</Text></View>
        <Text>{p.nr || p.id} · {p.namn} · {u.nr}</Text>
        <Text>Upprättad: {d.datum} · Skapad av: {d.skapadAv || "________________"}</Text>
      </View>
      {f.map(([k, v]) => <View key={k} style={s.row} wrap={false}><Text style={s.label}>{k}</Text><Text style={s.value}>{v || "—"}</Text></View>)}
      <View style={s.box}><Text style={s.bold}>{typ === "underlag" ? "Utfört arbete" : "Omfattning / omständighet"}</Text><Text>{u.benamning || "—"}</Text></View>
      {typ === "avi" ? <Kalkyltabell rader={d.rader || []} summor={d.summor} /> : null}
      {typ === "avi" ? <View style={s.box}><Text>Material och UE: faktisk kostnad plus 10 % enligt ABT 06 kap. 6 § 9. Övertid 50 % är faktor 1,5 och 100 % är faktor 2. Arbetet utförs först när beställaren skriftligen godkänt avin.</Text></View> : null}
      {typ === "underrattelse" ? <View style={s.box}><Text style={s.bold}>Grund för ÄTA eller hinder</Text><Text>{orsak}</Text><Text>Kostnads- och tidspåverkan: {u.belopp == null ? "Ej fastställd" : fmtSEK(u.belopp)}. Specificering och reglering enligt kontraktet.</Text></View> : null}
      {typ === "pris" ? <View style={s.box}><Text style={s.bold}>Beställarens beslut</Text><Text>□ Godkänns    □ Godkänns med ändring    □ Avslås</Text><Text>Ändring / kommentar: _________________________________________</Text><Text>___________________________________________________________</Text></View> : null}
      {typ === "underlag" ? <View style={s.box}><Text style={s.bold}>Dagboksutdrag / kostnadsunderlag</Text>{d.dagbok.length ? d.dagbok.map((r) => <Text key={r.id}>{r.startdatum || "—"} · {r.omfattning || "—"} · {r.faktiskTid ?? "—"} h</Text>) : <Text>Inga dagboksrader kopplade till {u.nr}. Underlaget behöver kompletteras.</Text>}</View> : null}
      <View style={s.box}><Text>Dokumentet hör till projektets ÄTA-process enligt ABT 06. Kontrollera kontraktets ändringar, underrättelsekrav och prisgrund före användning. Ett utskrivet dokument innebär inte att underrättelse har skickats eller godkännande erhållits.</Text></View>
      <View style={s.sign} wrap={false}>
        {["För ONE Nordic AB", typ === "pris" || typ === "avi" ? "Godkännes – för beställaren" : typ === "underrattelse" ? "Mottaget av beställaren" : "Granskat av"].map((text) => <View style={s.signBox} key={text}><Text style={s.bold}>{text}</Text><Text>Signatur: _______________________</Text><Text>Namn: __________________________</Text><Text>Datum: _________________________</Text></View>)}
      </View>
      <View fixed style={s.foot}><Text>{u.nr} · {p.nr || p.id} · ONE Nordic AB</Text><Text render={({ pageNumber, totalPages }) => `Sida ${pageNumber} av ${totalPages}`} /></View>
    </Page>
  </Document>;
}
