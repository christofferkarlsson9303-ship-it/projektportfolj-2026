import { useEffect, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { StatTile } from "../components/ds/index.js";
import { DirektivKort } from "../components/projektstart/Direktiv.jsx";
import { UppstartKort } from "../components/projektstart/Uppstart.jsx";
import { direktivLage, uppstartLage } from "../lib/projektstart.js";

/* Projektstart — ONE P:s initiering för ett projekt: projektdirektivet och
   uppstartsavstämningen. Båda är underlag till hållpunkterna 1.22 och 1.23
   i Bygga batteripark (grind G1). Vad de innehåller står i
   data/projektstart.js, logiken i lib/projektstart.js och korten i
   components/projektstart/. */

const SIGN_HINT = { giltig: "giltig", inaktuell: "ändrat efter signering", saknas: "saknas" };

export function Projektstart() {
  const { state } = usePortfolj();
  const { valtProjekt: pid, postFokus } = useUi();

  /* Länkar från checklistan pekar ut ett av korten. */
  const [sedd, setSedd] = useState(null);
  const [mal, setMal] = useState(null);
  if (postFokus?.vy === "projektstart" && postFokus.tid !== sedd) {
    setSedd(postFokus.tid);
    setMal({ id: String(postFokus.id), tid: postFokus.tid });
  }
  useEffect(() => {
    if (!mal) return undefined;
    const t = setTimeout(
      () => document.getElementById(mal.id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0
    );
    return () => clearTimeout(t);
  }, [mal]);

  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return null;

  const dir = direktivLage(state, pid);
  const upp = uppstartLage(state, pid);
  const antalSign = [dir.ib, dir.pl].filter((s) => s.status === "giltig").length;

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile
            label="Direktivets obligatoriska fält"
            value={`${dir.kravIfyllda}/${dir.kravTotalt}`}
            hint={dir.komplett ? "komplett" : "fyll i det som saknas"}
            ton={dir.komplett ? "" : "warn"}
          />
          <StatTile
            label="Projekttriangeln"
            value={dir.triangel.hogst ? dir.triangel.hogst.namn : "—"}
            hint={dir.triangel.ok ? `högst prioriterad · ${dir.triangel.hogst?.varde ?? ""} %` : `summa ${dir.triangel.summa} %`}
            ton={dir.triangel.ok && dir.triangel.hogst ? "" : "warn"}
          />
          <StatTile
            label="Signaturer"
            value={`${antalSign}/2`}
            hint={`IB ${SIGN_HINT[dir.ib.status]} · PL ${SIGN_HINT[dir.pl.status]}`}
            ton={dir.signerat ? "" : antalSign ? "warn" : "bad"}
          />
          <StatTile
            label="Uppstartsavstämning"
            value={`${upp.klara}/${upp.totalt}`}
            hint={upp.godkand ? `klartecken ${upp.rad.uppstartOk}` : "inget klartecken"}
            ton={upp.godkand ? "" : "bad"}
          />
        </div>

        <DirektivKort projekt={p} lage={dir} />
        <UppstartKort projekt={p} lage={upp} direktivSignerat={dir.signerat} />
      </div>
    </>
  );
}
