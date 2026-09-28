import { useMemo } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { SelStatus } from "../components/ui/Primitiver.jsx";
import { Card, StatTile } from "../components/ds/index.js";
import { PTag } from "../components/ui/PTag.jsx";
import { DatumFalt } from "../components/ui/Falt.jsx";
import { dagarTill } from "../lib/datum.js";
import { gallerFor, projekt } from "../lib/berakningar.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

/* Öppna punkter på designsystemet: nyckeltal överst och registret som Card
   med täthetsväljaren i huvudet. */

export function Punkter() {
  const { state, uppd, uppdStatus, laggTill } = usePortfolj();
  const { valtProjekt: pid, fraga } = useUi();

  const proj = projekt(state, pid);

  const rader = useMemo(
    () =>
      state.punkter
        .filter((pt) => gallerFor(pt, pid))
        .sort((a, b) => (a.forfaller || "9999").localeCompare(b.forfaller || "9999")),
    [state.punkter, pid]
  );

  if (!proj) return null;

  const nyPunkt = async () => {
    const sv = await fraga({
      titel: "Ny punkt",
      falt: [
        { namn: "titel", etikett: "Beskriv punkten", typ: "textarea" },
        { namn: "forfaller", etikett: "Förfaller (valfritt)", typ: "date" },
      ],
      ok: "Lägg till",
    });
    if (!sv || !sv.titel) return;
    laggTill("punkter", {
      id: "p" + Date.now(),
      projektId: pid,
      titel: sv.titel,
      agare: hamtaNamn() || "Christoffer Karlsson",
      forfaller: sv.forfaller || "",
      status: "oppen",
    });
  };

  const arSen = (pt) => {
    const d = pt.forfaller ? dagarTill(pt.forfaller) : null;
    return d !== null && d < 0 && pt.status === "oppen";
  };

  const oppna = rader.filter((pt) => pt.status === "oppen");
  const sena = oppna.filter(arSen).length;
  const veckan = oppna.filter((pt) => {
    const d = pt.forfaller ? dagarTill(pt.forfaller) : null;
    return d !== null && d >= 0 && d <= 7;
  }).length;
  const utanDatum = oppna.filter((pt) => !pt.forfaller).length;

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile label="Öppna punkter" value={oppna.length} hint={`av ${rader.length} totalt`} />
          <StatTile
            label="Förfallna"
            value={sena}
            ton={sena ? "bad" : ""}
            hint={sena ? "har passerat sitt datum" : "inga förfallna"}
          />
          <StatTile
            label="Inom sju dagar"
            value={veckan}
            ton={veckan ? "warn" : ""}
            hint="förfaller den närmaste veckan"
          />
          <StatTile label="Utan datum" value={utanDatum} hint="sätt förfallodatum så syns de i Idag" />
        </div>

        <Card
          id="punkter-rubrik"
          title={`Öppna punkter — ${(proj.nr ? proj.nr + " " : "") + proj.namn}`}
          subtitle="Sortera på valfri kolumn, filtrera på status eller sök i fritext. Rader som passerat sitt datum är markerade."
          action={<Tathetsvaljare />}
        >
          <DataTable
            etikett="Öppna punkter"
            exportNamn="Oppna_punkter"
            rader={rader}
            tomText="Inga öppna punkter."
            radKlass={(pt) => (arSen(pt) ? "rad-sen" : "")}
            verktyg={
              <button type="button" className="btn sec mini" onClick={nyPunkt}>
                + Lägg till punkt
              </button>
            }
            fotnot="Rader märkta OKLARHET är motsägelser i underlaget som behöver redas ut."
            kolumner={[
              {
                nyckel: "projektId",
                rubrik: "Projekt",
                bredd: 110,
                filter: true,
                filterEtikett: (v) => {
                  const p = state.projekt.find((x) => x.id === v);
                  return p ? (p.nr ? p.nr + " " : "") + p.namn : v === "bada" ? "Båda" : v;
                },
                textVarde: (pt) => {
                  const p = state.projekt.find((x) => x.id === pt.projektId);
                  return p ? `${p.nr || ""} ${p.namn} ${p.ort || ""}` : pt.projektId;
                },
                render: (pt) => <PTag pid={pt.projektId} />,
              },
              { nyckel: "titel", rubrik: "Punkt" },
              { nyckel: "agare", rubrik: "Ägare", bredd: 150, filter: true },
              {
                nyckel: "forfaller",
                rubrik: "Förfaller",
                bredd: 150,
                sortVarde: (pt) => pt.forfaller || "9999",
                render: (pt) => (
                  <DatumFalt
                    varde={pt.forfaller || ""}
                    etikett={`Förfallodatum för ${pt.titel}`}
                    onCommit={(v) => uppd("punkter", pt.id, "forfaller", v)}
                  />
                ),
              },
              {
                nyckel: "kvar",
                rubrik: "Kvar",
                bredd: 80,
                typ: "num",
                sortVarde: (pt) => (pt.forfaller ? dagarTill(pt.forfaller) : 99999),
                textVarde: (pt) => (pt.forfaller ? `${dagarTill(pt.forfaller)} d` : ""),
                exportVarde: (pt) => (pt.forfaller ? dagarTill(pt.forfaller) : ""),
                render: (pt) => {
                  const d = pt.forfaller ? dagarTill(pt.forfaller) : null;
                  if (d === null) return "—";
                  return (
                    <span className={arSen(pt) ? "font-bold text-bad-ink" : undefined}>
                      {d} d{arSen(pt) ? <span className="sr-only"> — förfallen</span> : null}
                    </span>
                  );
                },
              },
              {
                nyckel: "status",
                rubrik: "Status",
                bredd: 150,
                filter: true,
                filterEtikett: (v) => ({ oppen: "Öppen", klarmarkerad: "Klar" })[v] || v,
                render: (pt) => (
                  <SelStatus
                    alternativ={["oppen", "klarmarkerad"]}
                    varde={pt.status}
                    etikett={`Status för ${pt.titel}`}
                    onChange={(v) => uppdStatus("punkter", pt.id, "status", v)}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
