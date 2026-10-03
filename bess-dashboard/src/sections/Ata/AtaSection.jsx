import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Projektvaljare } from "../../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../../components/ui/Vyvaljare.jsx";
import { Callout, Card, StatTile, StatusBadge } from "../../components/ds/index.js";
import { fmtSEK } from "../../lib/format.js";
import { nyAtaPost } from "../../lib/nyaPoster.js";
import { ataSummering, prisGrind, projekt, underrattelseLage } from "../../lib/berakningar.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { harBatchCKontrakt } from "../../lib/kontraktsgrund.js";
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
   De svarar på "hur ligger vi till" och ska inte gömmas bakom ett vyval.
   Allt står på designsystemet: StatTile, Callout och Card, med vyvalet i
   registerkortets huvud. */

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

    const post = nyAtaPost(state, pid, { benamning: sv.benamning, ansvarig: hamtaNamn() || "" });
    laggTill("ur", post);
    setOppen(post.id);
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

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile label="Poster i UR-serien" value={n.s.antal} hint={`varav ${n.s.oppna} ej stängda`} />
          <StatTile label="Godkänt belopp" value={fmtSEK(n.s.belopp)} hint="godkänt, fakturerat eller stängt" />
          <StatTile
            label="Godkänt ej fakturerat"
            value={fmtSEK(n.s.ejFakt)}
            hint={n.ejFakt.length ? "fakturera samma vecka" : "inget väntar"}
            ton={n.ejFakt.length ? "warn" : ""}
          />
          <StatTile
            label="Grindar som larmar"
            value={larm}
            hint="24-timmarsfrist och prisgodkännande"
            ton={larm ? "bad" : ""}
          />
        </div>

        {pid && !harBatchCKontrakt(pid) ? (
          <Callout>
            <b>Fristerna är en mall.</b> 24-timmarsfristen och prisgodkännandet kommer från Batch C. Kontrollera
            underrättelsefrist, prisregler och ersättning i projektets eget kontrakt.
          </Callout>
        ) : null}

        {n.utan24.length ? (
          <Callout ton="bad">
            <b>
              {n.utan24.length} post{n.utan24.length > 1 ? "er" : ""} saknar underrättelse mer än 24 timmar
              efter händelsen.
            </b>{" "}
            Utan underrättelse kan rätten till ersättning gå förlorad (ABT 06 kap. 2 § 7 och kap. 5 § 4).
            Skicka underrättelsen först — komplettera blanketten sedan.
          </Callout>
        ) : null}

        {n.utanPris.length ? (
          <Callout ton="warn">
            <b>
              {n.utanPris.length} post{n.utanPris.length > 1 ? "er" : ""} har startat utan skriftligt godkänt
              pris.
            </b>{" "}
            Enligt processen ska priset vara godkänt före start. Dokumentera i dagboken varje dag arbetet
            pågår.
          </Callout>
        ) : null}

        <Card
          id="ata-register"
          title={`UR- och ÄTA-register — ${projektNamn}`}
          subtitle="Prissättning mot beställaren enligt Bilaga 06.1 (ABT 06). Bilaga 3 gäller mot egna UE under ABT-U 07."
          action={
            <>
              <ViewSwitcher vy={vy} onValj={setVy} />
              {vy === "table" ? <Tathetsvaljare /> : null}
              {vy !== "table" ? nyKnapp : null}
            </>
          }
        >
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
        </Card>

        <Card
          id="ata-processen"
          title="Processen i sju steg"
          subtitle="Så här ska varje post drivas — ur ÄTA-processen i projektmodellen."
        >
          <ol aria-label="ÄTA-processen i sju steg" className="m-0 list-none p-0">
            {PROCESSEN.map(([steg, atgard, nar], i) => (
              <li
                key={steg}
                className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 border-0 border-t border-solid border-hairline py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-info-bg font-head text-sm font-bold text-info-ink"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <b className="block text-[13.5px] text-ink">{steg.replace(/^\d+\. /, "")}</b>
                  <span className="text-[13px] leading-snug text-ink-soft">{atgard}</span>
                </div>
                <div className="col-start-2 sm:col-start-auto">
                  <StatusBadge label={nar} ton={i === 1 ? "warn" : "neutral"} />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {valdPost ? <AtaDrawerDetails u={valdPost} onStang={() => setOppen(null)} /> : null}
    </>
  );
}
