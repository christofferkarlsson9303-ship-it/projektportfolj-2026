import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import logotyp from "../../assets/one-nordic-logo.png";
import dejavu from "../../assets/fonts/DejaVuSans.ttf?inline";
import dejavuFet from "../../assets/fonts/DejaVuSans-Bold.ttf?inline";
import openSans from "../../assets/fonts/open-sans-latin-400-normal.woff?inline";
import openSansHalvfet from "../../assets/fonts/open-sans-latin-600-normal.woff?inline";
import openSansFet from "../../assets/fonts/open-sans-latin-700-normal.woff?inline";
import robotoSlab from "../../assets/fonts/roboto-slab-latin-400-normal.woff?inline";
import robotoSlabFet from "../../assets/fonts/roboto-slab-latin-700-normal.woff?inline";
import { STYRNINGSRAPPORT } from "../../data/styrningsrapport.js";

/* "Så styr appen projektet" som PDF, i samma grafiska profil som projektstartens
   beslutsunderlag (ProjektstartPdf.jsx): Roboto Slab för rubriker, Open Sans för
   brödtext, DejaVu för tecken som saknas. Texten kommer ur data/styrningsrapport.js.
   Samma regler för sidfoten som där: fristående fasta element, inget lineHeight på Page. */

const registrerade = Font.getRegisteredFontFamilies();
if (!registrerade.includes("FieldSans")) Font.register({ family: "FieldSans", fonts: [{ src: dejavu }, { src: dejavuFet, fontWeight: 700 }] });
if (!registrerade.includes("OpenSans")) {
  Font.register({ family: "OpenSans", fonts: [{ src: openSans }, { src: openSansHalvfet, fontWeight: 600 }, { src: openSansFet, fontWeight: 700 }] });
}
if (!registrerade.includes("RobotoSlab")) Font.register({ family: "RobotoSlab", fonts: [{ src: robotoSlab }, { src: robotoSlabFet, fontWeight: 700 }] });
Font.registerHyphenationCallback((word) => [word]);

const BROD = ["OpenSans", "FieldSans"];
const RUBRIK = ["RobotoSlab", "FieldSans"];
// Profilens färger, samma som i ProjektstartPdf.jsx (PDF:en kan inte läsa CSS-variabler).
const F = { djup: "#005f76", bla: "#00b6de", ljus: "#f5f7f9", linje: "#bdd5d7", text: "#304047", dov: "#5f6f76" };

const s = StyleSheet.create({
  page: { fontFamily: BROD, fontSize: 10, color: F.text, backgroundColor: "#fff", paddingTop: 42, paddingBottom: 64, paddingHorizontal: 45 },
  footLinje: { position: "absolute", bottom: 46, left: 0, right: 0, height: 0.8, backgroundColor: F.bla },
  footVanster: { position: "absolute", bottom: 17, left: 45, width: 300, fontSize: 7.5, color: F.dov },
  footSida: { position: "absolute", bottom: 17, right: 45, width: 150, fontSize: 7.5, color: F.dov, textAlign: "right" },
  topp: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 14, borderBottom: `1.2pt solid ${F.bla}`, marginBottom: 20 },
  logo: { width: 76, height: 49, objectFit: "contain" },
  toppHoger: { fontSize: 9, color: F.djup, fontWeight: 600, textAlign: "right", marginTop: 6 },
  overrubrik: { fontSize: 9, fontWeight: 600, color: F.bla, letterSpacing: 1.6, marginBottom: 6 },
  titel: { fontFamily: RUBRIK, fontSize: 26, fontWeight: 700, color: F.djup, marginBottom: 6 },
  undertitel: { fontSize: 11, color: F.dov, lineHeight: 1.2, marginBottom: 18 },
  h2: { fontFamily: RUBRIK, fontSize: 15, fontWeight: 700, color: F.djup, marginTop: 14, marginBottom: 7 },
  h3: { fontSize: 11, fontWeight: 700, color: F.djup, marginTop: 8, marginBottom: 4 },
  stycke: { lineHeight: 1.15, marginBottom: 7 },
  punkt: { flexDirection: "row", marginBottom: 3.5 },
  punktTecken: { width: 14, color: F.bla, fontWeight: 700 },
  punktText: { flex: 1, lineHeight: 1.15 },
  thRad: { flexDirection: "row", backgroundColor: F.ljus, borderBottom: `0.8pt solid ${F.linje}` },
  th: { fontSize: 8.5, fontWeight: 700, color: F.djup, paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottom: `0.6pt solid ${F.linje}` },
  td: { fontSize: 8.8, lineHeight: 1.15, paddingVertical: 4.5, paddingHorizontal: 5 },
});

/* Första kolumnen är rubriken på raden; den får lite mindre plats än beskrivningarna. */
const breddFor = (n) => (j) => (n === 3 ? ["28%", "40%", "32%"][j] : `${100 / n}%`);

/* Sidbrytning: rubriker får aldrig stå ensamma sist på en sida. Varje block tar emot
   rubrikerna före sig (`fore`) och lägger dem i en odelbar View tillsammans med sig.
   Varje block är odelbart i sin helhet (alla är kortare än en sida): en odelbar del inne
   i en delbar View ritades ovanpå sidfoten eller andra rader vid sidbrytningen. */

function Tabell({ b, fore }) {
  const bredd = breddFor(b.kolumner.length);
  const rad = (r, i) => (
    <View key={i} style={s.tr} wrap={false}>
      {r.map((c, j) => (
        <Text key={j} style={[s.td, { width: bredd(j) }, j === 0 ? { fontWeight: 600 } : null]}>
          {c}
        </Text>
      ))}
    </View>
  );
  return (
    <View style={{ marginBottom: 9 }} wrap={false}>
      {fore}
      <View style={[s.thRad, { marginTop: 3, borderTop: `0.8pt solid ${F.linje}` }]}>
        {b.kolumner.map((k, j) => (
          <Text key={k} style={[s.th, { width: bredd(j) }]}>
            {k}
          </Text>
        ))}
      </View>
      {b.rader.map(rad)}
    </View>
  );
}

function Punkt({ p, i, numrerad }) {
  return (
    <View style={s.punkt}>
      <Text style={s.punktTecken}>{numrerad ? `${i + 1}.` : "•"}</Text>
      <Text style={s.punktText}>{p}</Text>
    </View>
  );
}

function Punkter({ punkter, numrerad, fore }) {
  return (
    <View style={{ marginBottom: 7 }} wrap={false}>
      {fore}
      {punkter.map((p, i) => (
        <Punkt key={i} p={p} i={i} numrerad={numrerad} />
      ))}
    </View>
  );
}

function Block({ b, fore }) {
  if (b.typ === "stycke") {
    return (
      <View wrap={false}>
        {fore}
        <Text style={s.stycke}>{b.text}</Text>
      </View>
    );
  }
  if (b.typ === "lista" || b.typ === "numrerad") return <Punkter punkter={b.punkter} numrerad={b.typ === "numrerad"} fore={fore} />;
  if (b.typ === "tabell") return <Tabell b={b} fore={fore} />;
  return null;
}

/** Avsnittets block, med rubrikerna (avsnittets och mellanrubrikerna) knutna till blocket efter. */
function Avsnitt({ a }) {
  const ut = [];
  let fore = [<Text key="h2" style={s.h2}>{a.rubrik}</Text>];
  a.block.forEach((b, i) => {
    if (b.typ === "rubrik") {
      fore.push(<Text key={`h3-${i}`} style={s.h3}>{b.text}</Text>);
      return;
    }
    ut.push(<Block key={i} b={b} fore={fore} />);
    fore = [];
  });
  return <View>{ut}</View>;
}

export function StyrningsrapportPdf({ rapport = STYRNINGSRAPPORT, datum = "" }) {
  return (
    <Document title={rapport.titel} author="ONE Nordic AB" subject={rapport.undertitel} language="sv">
      <Page size="A4" style={s.page}>
        <View style={s.topp}>
          <Image src={logotyp} style={s.logo} />
          <Text style={s.toppHoger}>
            Projektportföljen{"\n"}Version {rapport.version}
          </Text>
        </View>
        <Text style={s.overrubrik}>ARBETSSÄTT OCH BESLUTSUNDERLAG</Text>
        <Text style={s.titel}>{rapport.titel}</Text>
        <Text style={s.undertitel}>{rapport.undertitel}</Text>
        {rapport.avsnitt.map((a) => (
          <Avsnitt key={a.id} a={a} />
        ))}
        <View fixed style={s.footLinje} />
        <Text fixed style={s.footVanster}>
          {`${rapport.titel} · ONE Nordic AB · Arbetsmaterial${datum ? ` · Utskrivet ${datum}` : ""}`}
        </Text>
        <Text fixed style={s.footSida} render={({ pageNumber, totalPages }) => `Sida ${pageNumber} av ${totalPages}`} />
      </Page>
    </Document>
  );
}
