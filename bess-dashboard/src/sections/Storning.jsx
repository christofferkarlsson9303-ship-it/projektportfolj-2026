import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Note, SelStatus } from "../components/ui/Primitiver.jsx";
import { Falt, DatumFalt, Kryss } from "../components/ui/Falt.jsx";
import { Ruta } from "../components/ui/Utskrift.jsx";
import { dagarTill, idag } from "../lib/datum.js";
import { projekt } from "../lib/berakningar.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

/* Rutorna A–F i blanketten. Vägledningen är hämtad ur ONE Nordics mall och
   styr vad projektledaren faktiskt ska skriva — den är en del av dokumentet,
   inte hjälptext som kan kortas bort. */
const RUTOR = [
  [
    "rutaA",
    "Ruta A — One skulle ha utfört följande arbete",
    "Beskriv kort vilket arbete som skulle utföras innan det visade sig att One inte kunde utföra det, på grund av hinder eller ÄTA. Ange både planerat startdatum och planerat slutdatum.",
    "Vi skulle ha utfört grävning med maskin X och Y för att kunna lägga ner kabel Z. Arbetet skulle ha påbörjats den 5 april och avslutats den 7 april.",
  ],
  [
    "rutaB",
    "Ruta B — Följande personer var planerade att delta",
    "Beskriv vilka personer som skulle ha deltagit och vilka roller de har — montör, personal från underentreprenör, projektledare, beredare och så vidare.",
    "",
  ],
  [
    "rutaC",
    "Ruta C — Material, maskiner och verktyg som planerats",
    "Beskriv utförligt allt material och alla maskiner som hade avsatts för arbetet.",
    "",
  ],
  [
    "rutaD",
    "Ruta D — One kunde inte utföra arbetet på grund av",
    "Berätta vad som hänt som gjorde att ni inte kunde utföra arbetet som tänkt. Var så detaljerad som möjligt.",
    "Vi fick fel nycklar. / Vi behövde först utföra X innan vi bedömde att vi kunde utföra det planerade arbetet.",
  ],
  [
    "rutaE",
    "Ruta E — Åtgärder One var tvungna att vidta",
    "Beskriv vad som hände när ni inte kunde utföra arbetet som planerat.",
    "Vi fick ringa person A och be denne komma med rätt nycklar. Vi kunde inte arbeta under den tiden.",
  ],
  [
    "rutaF",
    "Ruta F — Så påverkas det fortsatta arbetet",
    "Hur påverkar hindret eller ÄTA det fortsatta arbetet? Behöver ni mer tid för färdigställande? Ska arbeten planeras om?",
    "Eftersom vi fick vänta på nycklar kunde vi inte utföra arbete under 4 timmar. Vi fick skjuta upp arbetet till nästa dag.",
  ],
];

const HUVUDFALT = [
  ["affarsId", "AffärsID"],
  ["aoNummer", "AO-nummer"],
  ["projektNamn", "Projekt"],
];

const ANSVARSFALT = [
  ["upprattadAv", "Upprättad av"],
  ["projektledare", "Projektledare"],
  ["projektchef", "Projektchef"],
  ["ataNummer", "ÄTA-nummer"],
];

/* ---------- A4-utskriften ---------- */

function StorningUtskrift({ s }) {
  const rad = (a, b, c, d) => (
    <tr>
      <th>{a}</th>
      <td>{b}</td>
      {c !== undefined ? <th>{c}</th> : null}
      {c !== undefined ? <td>{d}</td> : null}
    </tr>
  );

  return (
    <>
      <h1>Underrättelse om störning</h1>
      <div className="sub">AB 04/ABT 06 · ONE Nordic AB · one-nordic.se</div>

      <table>
        <tbody>
          {rad("AffärsID", s.affarsId, "AO-nummer", s.aoNummer)}
          {rad("Projekt", s.projektNamn, "Datum/revdatum", s.datum)}
          {rad("Upprättad av", s.upprattadAv, "ÄTA-nummer", s.ataNummer)}
          {rad("Projektledare", s.projektledare, "Projektchef", s.projektchef)}
          <tr>
            <th>Till</th>
            <td colSpan={3}>{s.till}</td>
          </tr>
        </tbody>
      </table>

      <Ruta bokstav="A" rubrik="One skulle ha utfört följande arbete" varde={s.rutaA} />
      <Ruta bokstav="B" rubrik="Följande personer var planerade att delta i arbetet" varde={s.rutaB} />
      <Ruta
        bokstav="C"
        rubrik="Följande material, maskiner och verktyg hade planerats för arbetet"
        varde={s.rutaC}
      />
      <Ruta bokstav="D" rubrik="One kunde inte utföra arbetet på grund av" varde={s.rutaD} />
      <Ruta bokstav="E" rubrik="One var tvungna att vidta följande åtgärder" varde={s.rutaE} />
      <Ruta
        bokstav="F"
        rubrik="Den beskrivna situationen påverkar det fortsatta arbetet på så sätt att"
        varde={s.rutaF}
      />

      <div className="box">
        <b>G — Övrigt / behov av besked</b>
        {s.begarSynpunkter ? "☒" : "☐"} One begär att beställaren återkommer med synpunkter gällande Ones
        plan för hantering av störningen.
        <br />
        {s.innebarForsening ? "☒" : "☐"} Vi bedömer att arbetet kommer att försena projektets del- och/eller
        sluttider och begär därför förlängning av dessa tider.
      </div>

      <div className="box">
        <b>H — Begärd beställning/besked önskas senast</b>
        {s.svarSenast || "—"}
      </div>

      <div className="fot">
        One förbehåller sig rätten att återkomma med en specificerad kostnadssammanställning samt en
        specifikation av övriga konsekvenser som uppkommit på grund av störningen.
        <br />
        Underrättelse {s.nr} · utskriven {idag()} · ONE Nordic AB · one-nordic.se
      </div>
    </>
  );
}

/* ---------- Blanketten ---------- */

function Storningsformular({ s, onStang }) {
  const { uppd, uppdBool, taBort, laggTill } = usePortfolj();
  const { bekrafta, skrivUt, visaToast, oppnaPost } = useUi();

  const taBortPost = async () => {
    const ja = await bekrafta("Underrättelsen tas bort ur portföljen. Åtgärden går inte att ångra.", {
      titel: "Ta bort underrättelsen?",
      ok: "Ta bort",
      fara: true,
    });
    if (!ja) return;
    taBort("storningar", s.id);
    onStang();
    visaToast("Underrättelsen borttagen", "warn");
  };

  const dagboksrad = () => {
    const id = "d" + Date.now();
    laggTill("dagbok", {
      id,
      projektId: s.projektId,
      ataRef: s.nr || "",
      titel: "",
      startdatum: idag(),
      omfattning: "",
      vader: "",
      kostnad: "",
      ombud: "",
      forvantadTid: "",
      faktiskTid: "",
      kravSignering: false,
      signerad: false,
      fakturerad: false,
      notering: "",
    });
    oppnaPost("dagbok", id);
  };

  return (
    <section className="card" role="region" aria-label={`Underrättelse ${s.nr}`} style={{ marginTop: 16 }}>
      <div className="kortrad">
        <div style={{ minWidth: 0 }}>
          <h3>Underrättelse {s.nr}</h3>
          <div className="lead" style={{ marginBottom: 0 }}>
            Fyll i, skriv ut till PDF och skicka till beställaren. Spara ner den skickade underrättelsen på
            Ones SharePoint.
          </div>
        </div>
        <div className="kortverktyg">
          <button type="button" className="btn sec mini" onClick={onStang}>
            Stäng
          </button>
        </div>
      </div>

      <div className="frow" style={{ marginTop: 14 }}>
        {HUVUDFALT.map(([nyckel, rubrik]) => (
          <div className="f" key={nyckel}>
            <label htmlFor={`${nyckel}-${s.id}`}>{rubrik}</label>
            <Falt
              id={`${nyckel}-${s.id}`}
              varde={s[nyckel] || ""}
              etikett={rubrik}
              onCommit={(v) => uppd("storningar", s.id, nyckel, v)}
            />
          </div>
        ))}
        <div className="f">
          <label htmlFor={`datum-${s.id}`}>Datum / revdatum</label>
          <DatumFalt
            id={`datum-${s.id}`}
            varde={s.datum}
            etikett="Datum eller revideringsdatum"
            onCommit={(v) => uppd("storningar", s.id, "datum", v)}
          />
        </div>
      </div>

      <div className="frow">
        {ANSVARSFALT.map(([nyckel, rubrik]) => (
          <div className="f" key={nyckel}>
            <label htmlFor={`${nyckel}-${s.id}`}>{rubrik}</label>
            <Falt
              id={`${nyckel}-${s.id}`}
              varde={s[nyckel] || ""}
              etikett={rubrik}
              onCommit={(v) => uppd("storningar", s.id, nyckel, v)}
            />
          </div>
        ))}
      </div>

      <div className="f">
        <label htmlFor={`till-${s.id}`}>Till</label>
        <Falt
          id={`till-${s.id}`}
          varde={s.till || ""}
          placeholder="Beställarens mottagare"
          etikett="Mottagare hos beställaren"
          onCommit={(v) => uppd("storningar", s.id, "till", v)}
        />
      </div>

      {RUTOR.map(([nyckel, rubrik, guide, exempel]) => (
        <div className="f" key={nyckel}>
          <label htmlFor={`${nyckel}-${s.id}`}>{rubrik}</label>
          <p className="guide">
            {guide}
            {exempel ? (
              <>
                <br />
                <i>Exempel: {exempel}</i>
              </>
            ) : null}
          </p>
          <Falt
            id={`${nyckel}-${s.id}`}
            flerrad
            varde={s[nyckel] || ""}
            etikett={rubrik}
            onCommit={(v) => uppd("storningar", s.id, nyckel, v)}
          />
        </div>
      ))}

      <div className="f">
        <span className="block text-[11px] font-bold uppercase tracking-[.06em] text-ink-soft">
          Ruta G — Övrigt / behov av besked
        </span>
        <p className="guide">
          Kryssa i begäran om synpunkter när störningen utgjort ett ÄTA-arbete. Rutan om försening ska
          alltid kryssas i — därefter måste ni på nästa byggmöte förhandla om förlängd tidplan, och att
          omförhandling begärts måste framgå av byggmötesprotokollet.
        </p>
        <Kryss
          id={`cbG1-${s.id}`}
          checked={s.begarSynpunkter}
          onChange={(v) => uppdBool("storningar", s.id, "begarSynpunkter", v)}
        >
          One begär att beställaren återkommer med synpunkter gällande Ones plan för hantering av
          störningen.
        </Kryss>
        <Kryss
          id={`cbG2-${s.id}`}
          checked={s.innebarForsening}
          onChange={(v) => uppdBool("storningar", s.id, "innebarForsening", v)}
        >
          Vi bedömer att arbetet kommer att försena projektets del- och/eller sluttider och begär därför
          förlängning av dessa tider.
        </Kryss>
      </div>

      <div className="f" style={{ maxWidth: 280 }}>
        <label htmlFor={`svar-${s.id}`}>Ruta H — Besked önskas senast</label>
        <p className="guide">Datum då beställaren måste ha återkommit med synpunkter.</p>
        <DatumFalt
          id={`svar-${s.id}`}
          varde={s.svarSenast}
          etikett="Besked önskas senast"
          onCommit={(v) => uppd("storningar", s.id, "svarSenast", v)}
        />
      </div>

      <div className="rowbtns">
        <button type="button" className="btn" onClick={() => skrivUt(<StorningUtskrift s={s} />)}>
          Skriv ut / spara som PDF
        </button>
        <button type="button" className="btn sec" onClick={dagboksrad}>
          + Skapa dagboksrad
        </button>
        <button type="button" className="btn sec" onClick={taBortPost}>
          Ta bort
        </button>
      </div>

      <Note>
        <b>Efter utskick.</b> Spara den skickade underrättelsen på Ones SharePoint och dokumentera i
        dagboken: startdatum, omfattning, väder och temperatur, kostnad samt förväntad och faktisk
        tidsåtgång. Ska beställaren signera dagboken enligt kontraktet — skicka den för signering och ange
        i följemejlet ett svarsdatum, annars betraktas dagboken som undertecknad.
      </Note>
    </section>
  );
}

/* ---------- Sektionen ---------- */

export function Storning() {
  const { state, uppdStatus, laggTill } = usePortfolj();
  const { valtProjekt: pid, postFokus } = useUi();
  const [oppen, setOppen] = useState(null);

  const p = projekt(state, pid);

  const lista = useMemo(
    () =>
      state.storningar
        .filter((s) => s.projektId === pid)
        .sort((a, b) => (b.datum || "").localeCompare(a.datum || "")),
    [state.storningar, pid]
  );

  /* ÄTA-sektionen kan be oss öppna en nyskapad underrättelse. Se kommentaren
     i Dagbok om varför det sker under render och inte i en effekt. */
  const [sedd, setSedd] = useState(null);
  if (postFokus?.vy === "storning" && postFokus.tid !== sedd) {
    setSedd(postFokus.tid);
    setOppen(postFokus.id);
  }

  const oppet = lista.find((s) => s.id === oppen) || null;

  if (!p) return null;

  const nyUnderrattelse = () => {
    const nr = state.storningar.filter((s) => s.projektId === pid).length + 1;
    const id = "s" + Date.now();
    laggTill("storningar", {
      id,
      projektId: pid,
      nr: "ST" + String(nr).padStart(3, "0"),
      affarsId: "",
      aoNummer: p.nr,
      projektNamn: `${p.nr} ${p.namn}`,
      datum: idag(),
      upprattadAv: hamtaNamn() || "Christoffer Karlsson",
      projektledare: hamtaNamn() || "Christoffer Karlsson",
      projektchef: "",
      ataNummer: "",
      till: "Ingrid Capacity",
      rutaA: "",
      rutaB: "",
      rutaC: "",
      rutaD: "",
      rutaE: "",
      rutaF: "",
      begarSynpunkter: false,
      innebarForsening: true,
      svarSenast: "",
      status: "utkast",
    });
    setOppen(id);
  };

  const arSen = (s) => {
    const d = s.svarSenast ? dagarTill(s.svarSenast) : null;
    return d !== null && d < 0 && s.status !== "besvarad";
  };

  return (
    <>
      <Projektvaljare />

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Underrättelse om störning (AB 04/ABT 06)</h3>
        <div className="lead">
          En störning är allt som gör att arbetet inte fungerat som tänkt. Beror störningen på One som
          entreprenör ska ingen underrättelse skickas. I övriga fall ska beställaren alltid underrättas —
          även när störningen är ett hinder på Ones sida som ni inte kunnat förutse eller påverka. Utan
          underrättelse finns ingen rätt till ersättning.
        </div>
        <div className="rowbtns">
          <button type="button" className="btn" onClick={nyUnderrattelse}>
            + Ny underrättelse
          </button>
        </div>
      </div>

      <div className="card">
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>Register</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              {lista.length} underrättelser för {p.nr || p.namn}
            </div>
          </div>
          <div className="kortverktyg">
            <Tathetsvaljare />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <DataTable
            etikett="Underrättelser om störning"
            exportNamn="Storningar"
            rader={lista}
            radKlass={(s) => (arSen(s) ? "rad-sen" : "")}
            tomText="Inga underrättelser registrerade. Kandidater i projektet just nu: kabelströmstransformatorernas omleverans och den felaktiga kabelspecifikationen — bedöm först om orsaken ligger på beställarens sida eller på Ones."
            kolumner={[
              {
                nyckel: "nr",
                rubrik: "Nr",
                bredd: 96,
                render: (s) => (
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 font-bold text-one-bla underline decoration-dotted"
                    onClick={() => setOppen(oppen === s.id ? null : s.id)}
                    aria-expanded={oppen === s.id}
                  >
                    {s.nr || "—"}
                    <span className="sr-only"> — öppna underrättelsen</span>
                  </button>
                ),
              },
              { nyckel: "datum", rubrik: "Datum", bredd: 120 },
              {
                nyckel: "rutaA",
                rubrik: "Ärende",
                textVarde: (s) => s.rutaA || "Utan rubrik",
                render: (s) => (s.rutaA || "Utan rubrik").slice(0, 70),
              },
              { nyckel: "svarSenast", rubrik: "Svar senast", bredd: 130 },
              {
                nyckel: "kvar",
                rubrik: "Kvar",
                bredd: 80,
                typ: "num",
                sortVarde: (s) => (s.svarSenast ? dagarTill(s.svarSenast) : 99999),
                textVarde: (s) => (s.svarSenast ? `${dagarTill(s.svarSenast)} d` : ""),
                exportVarde: (s) => (s.svarSenast ? dagarTill(s.svarSenast) : ""),
                render: (s) => {
                  const d = s.svarSenast ? dagarTill(s.svarSenast) : null;
                  if (d === null) return "—";
                  return (
                    <span style={arSen(s) ? { color: "var(--rod)", fontWeight: 700 } : undefined}>
                      {d} d{arSen(s) ? <span className="sr-only"> — svarsfristen passerad</span> : null}
                    </span>
                  );
                },
              },
              {
                nyckel: "status",
                rubrik: "Status",
                bredd: 150,
                filter: true,
                filterEtikett: (v) =>
                  ({ utkast: "Utkast", skickad: "Skickad", besvarad: "Besvarad" })[v] || v,
                render: (s) => (
                  <SelStatus
                    alternativ={["utkast", "skickad", "besvarad"]}
                    varde={s.status}
                    etikett={`Status för ${s.nr}`}
                    onChange={(v) => uppdStatus("storningar", s.id, "status", v)}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>

      {oppet ? <Storningsformular s={oppet} onStang={() => setOppen(null)} /> : null}
    </>
  );
}
