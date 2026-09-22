import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Projektvaljare } from "../../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../../components/ui/Vyvaljare.jsx";
import { Kpi, Note, Tabellyta } from "../../components/ui/Primitiver.jsx";
import { fmtSEK } from "../../lib/format.js";
import { idag } from "../../lib/datum.js";
import { ataSummering, prisGrind, projekt, underrattelseLage } from "../../lib/berakningar.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { ViewSwitcher } from "./ViewSwitcher.jsx";
import { useAtaVy } from "./vyval.js";
import { AtaKanbanView } from "./AtaKanbanView.jsx";
import { AtaTableView } from "./AtaTableView.jsx";
import { AtaTimelineView } from "./AtaTimelineView.jsx";
import { AtaDrawerDetails } from "./AtaDrawerDetails.jsx";

/* ÄTA och hinder.

   Tre vyer över samma data — tavla, tabell och tidslinje — med en slide-over
   för detaljerna. ABT 06-motorn i berakningar.js och flaggor.js är orörd och
   matas med exakt samma poster som tidigare; det är bara gränssnittet som
   bytts ut.

   Nyckeltalen och de två varningarna ovanför vyn ligger kvar oavsett läge.
   De svarar på "hur ligger vi till" och ska inte gömmas bakom ett vyval. */

const PROCESSEN = [
  ["1. Identifiera", "Ingår detta i kontraktet? Tveksamt fall — öppna posten direkt.", "Direkt vid ny omständighet"],
  ["2. Underrätta", "Underrättelse om störning med AffärsID och AO-nummer.", "Max 24 timmar"],
  ["3. Dokumentera", "Dagbok med timmar per resurs, foton, vad och varför.", "Varje dag arbetet pågår"],
  ["4. Prissätt", "Pris innan arbetet startar — skriftligt godkännande.", "Före start"],
  ["5. Underlag", "Vad, varför, belopp, beräkning. Dagboksutdrag och foton bifogas.", "När arbetet är utfört"],
  ["6. Följ upp", "Varje byggmöte. ÄTA som inte drivs aktivt förfaller.", "Löpande"],
  ["7. Reglera", "Fakturera med UR-nummer, uppdatera status, ta med i slutavräkning.", "Samma vecka"],
];

export function Ata() {
  const { state, laggTill } = usePortfolj();
  const { valtProjekt: pid, fraga, postFokus } = useUi();
  const [vy, setVy] = useAtaVy("board");
  const [oppen, setOppen] = useState(null);

  /* Idag-vyn och andra sektioner kan peka ut ett enskilt ärende. Justering
     under render så att panelen är öppen redan i första målningen. */
  const [sedd, setSedd] = useState(null);
  if (postFokus?.vy === "ata" && postFokus.tid !== sedd) {
    setSedd(postFokus.tid);
    setOppen(postFokus.id);
  }

  const p = projekt(state, pid);

  const n = useMemo(() => {
    const rader = state.ur.filter((u) => u.projektId === pid);
    return {
      rader,
      s: ataSummering(state, pid),
      utan24: rader.filter((u) => underrattelseLage(u)?.varning),
      utanPris: rader.filter((u) => prisGrind(u)?.varning),
      ejFakt: rader.filter((u) => u.status === "godkand"),
    };
  }, [state, pid]);

  const valdPost = n.rader.find((u) => u.id === oppen) || null;

  if (!p) return null;

  const nyPost = async () => {
    const sv = await fraga({
      titel: "Ny ÄTA / UR-post",
      lead: "Händelsedatum sätts till idag — 24-timmarsfristen för underrättelse börjar räknas därifrån.",
      falt: [{ namn: "benamning", etikett: "Kort beskrivning av händelsen", typ: "textarea" }],
      ok: "Registrera",
    });
    if (!sv || !sv.benamning) return;

    const antal = state.ur.filter((u) => u.projektId === pid).length + 1;
    const id = "u" + Date.now();
    laggTill("ur", {
      id,
      projektId: pid,
      nr: "UR" + String(antal).padStart(3, "0"),
      benamning: sv.benamning,
      status: "oppen",
      klass: "oklar",
      handelseDatum: idag(),
      underrattelseDatum: "",
      prisgrund: "lopande",
      belopp: null,
      godkantDatum: "",
      fakturaDatum: "",
      arbeteStartat: false,
      orsak: "",
      ansvarig: hamtaNamn() || "",
    });
    setOppen(id);
  };

  const larm = n.utan24.length + n.utanPris.length;
  const projektNamn = (p.nr ? p.nr + " " : "") + p.namn;

  const nyKnapp = (
    <button type="button" className="btn mini" onClick={nyPost}>
      + Ny UR/ÄTA-post
    </button>
  );

  return (
    <>
      <Projektvaljare />

      <div className="grid g4">
        <Kpi label="Poster i UR-serien" varde={n.s.antal} hint={`varav ${n.s.oppna} ej stängda`} />
        <Kpi label="Godkänt belopp" varde={fmtSEK(n.s.belopp)} hint="godkänt, fakturerat eller stängt" />
        <Kpi
          label="Godkänt ej fakturerat"
          varde={fmtSEK(n.s.ejFakt)}
          hint={n.ejFakt.length ? "fakturera samma vecka" : "inget väntar"}
          klass={n.ejFakt.length ? "warn" : ""}
        />
        <Kpi
          label="Grindar som larmar"
          varde={larm}
          hint="24-timmarsfrist och prisgodkännande"
          klass={larm ? "bad" : ""}
        />
      </div>

      {n.utan24.length ? (
        <Note niva="bad">
          <b>
            {n.utan24.length} post{n.utan24.length > 1 ? "er" : ""} saknar underrättelse mer än 24 timmar
            efter händelsen.
          </b>{" "}
          Utan underrättelse kan rätten till ersättning gå förlorad (ABT 06 kap. 2 § 7 och kap. 5 § 4).
          Skicka underrättelsen först — komplettera blanketten sedan.
        </Note>
      ) : null}

      {n.utanPris.length ? (
        <Note>
          <b>
            {n.utanPris.length} post{n.utanPris.length > 1 ? "er" : ""} har startat utan skriftligt godkänt
            pris.
          </b>{" "}
          Enligt processen ska priset vara godkänt före start. Dokumentera i dagboken varje dag arbetet
          pågår.
        </Note>
      ) : null}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>UR- och ÄTA-register — {projektNamn}</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              Prissättning mot beställaren enligt Bilaga 06.1 (ABT 06). Bilaga 3 gäller mot egna UE under
              ABT-U 07.
            </div>
          </div>
          <div className="kortverktyg">
            <ViewSwitcher vy={vy} onValj={setVy} />
            {vy === "table" ? <Tathetsvaljare /> : null}
            {vy !== "table" ? nyKnapp : null}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          {vy === "board" ? (
            <AtaKanbanView
              rader={n.rader}
              projektNamn={projektNamn}
              vald={oppen}
              onOppna={setOppen}
              onVisaTabell={() => setVy("table")}
            />
          ) : null}

          {vy === "table" ? (
            <AtaTableView
              rader={n.rader}
              tomText={`Inga poster registrerade för ${p.nr || p.namn}.`}
              vald={oppen}
              onOppna={setOppen}
              verktyg={nyKnapp}
            />
          ) : null}

          {vy === "timeline" ? <AtaTimelineView rader={n.rader} onOppna={setOppen} /> : null}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Processen i sju steg</h3>
        <div className="lead">Så här ska varje post drivas — ur ÄTA-processen i projektmodellen.</div>
        <Tabellyta etikett="ÄTA-processen i sju steg">
          <table>
            <thead>
              <tr>
                <th scope="col" style={{ width: 150 }}>
                  Steg
                </th>
                <th scope="col">Åtgärd</th>
                <th scope="col" style={{ width: 180 }}>
                  När
                </th>
              </tr>
            </thead>
            <tbody>
              {PROCESSEN.map(([steg, atgard, nar]) => (
                <tr key={steg}>
                  <td data-label="Steg">
                    <b>{steg}</b>
                  </td>
                  <td data-label="Åtgärd">{atgard}</td>
                  <td data-label="När">{nar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabellyta>
      </div>

      {valdPost ? <AtaDrawerDetails u={valdPost} onStang={() => setOppen(null)} /> : null}
    </>
  );
}
