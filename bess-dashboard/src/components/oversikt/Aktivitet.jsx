import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { usePortfolj } from "../../state/hooks.js";
import { PTag } from "../ui/PTag.jsx";
import { Slideover } from "../ui/Slideover.jsx";
import { Andringslogg } from "../ui/Andringslogg.jsx";
import { fmtLoggTid, fmtRelativ } from "../../lib/datum.js";
import { aktivitetPerDag } from "../../lib/oversikt.js";
import { Lank, Ruta } from "./Ruta.jsx";

/* Aktivitetsflödet. Datan är ändringsloggen, som redan synkas i realtid mot
   den delade loggtabellen (PortfolioProvider lyssnar och slår ihop) — rutan
   renderar bara om när en ny post kommer in, oavsett vem som skrev den.

   Staplarna överst är händelser per dag i två veckor. Idag i ONE Blå, övriga
   dagar dämpade; pekare och piltangenter läser ut en dag i taget. */

const DAGAR = 14;
const I_FLODET = 6;

function initialer(namn) {
  const bas = String(namn || "").split("@")[0].trim();
  if (!bas || bas === "Okänd") return "?";
  const delar = bas.split(/[\s._-]+/).filter(Boolean);
  return ((delar[0]?.[0] || "") + (delar.length > 1 ? delar[delar.length - 1][0] : "")).toUpperCase();
}

function dagEtikett(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
}

export function Aktivitet({ i }) {
  const { state, conn } = usePortfolj();
  const [visaLogg, setVisaLogg] = useState(false);
  const [vald, setVald] = useState(null);
  const logg = useMemo(() => state.andringslogg || [], [state.andringslogg]);
  const dagar = useMemo(() => aktivitetPerDag(logg, DAGAR), [logg]);
  const max = Math.max(1, ...dagar.map((d) => d.antal));
  const summa = dagar.reduce((s, d) => s + d.antal, 0);

  /* "12 min sedan" ska inte stå still. En omritning i minuten räcker. */
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNu(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const stang = useCallback(() => setVisaLogg(false), []);

  const valjVidPekare = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setVald(Math.min(DAGAR - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * DAGAR))));
  };

  const valjVidTangent = (e) => {
    if (e.key === "ArrowLeft") setVald((v) => Math.max(0, (v ?? DAGAR - 1) - 1));
    else if (e.key === "ArrowRight") setVald((v) => Math.min(DAGAR - 1, (v ?? DAGAR - 1) + 1));
    else return;
    e.preventDefault();
  };

  const avlast = vald === null ? null : dagar[vald];
  const delad = conn.kl === "ok";

  /* Panelen ligger utanför rutan: rutan animeras in med transform, och ett
     transformerat förälderelement blir referensram för position: fixed. */
  return (
    <>
    <Ruta
      id="ov-aktivitet"
      i={i}
      klass="xl:row-span-2"
      ikon={Activity}
      titel="Aktivitet"
      under={delad ? "Uppdateras i realtid från den delade loggen" : "Loggas i den här webbläsaren"}
      atgard={
        <Lank onClick={() => setVisaLogg(true)} etikett="Visa hela ändringsloggen">
          Hela loggen
        </Lank>
      }
    >
      <div>
        <div
          className="ov-dagar"
          role="group"
          tabIndex={0}
          aria-label={`Händelser per dag de senaste ${DAGAR} dagarna. Piltangenterna väljer dag.`}
          onPointerMove={valjVidPekare}
          onPointerLeave={() => setVald(null)}
          onFocus={() => setVald(DAGAR - 1)}
          onBlur={() => setVald(null)}
          onKeyDown={valjVidTangent}
        >
          {dagar.map((d, k) => (
            <i
              key={d.datum}
              aria-hidden="true"
              className={k === DAGAR - 1 ? "idag" : k === vald ? "vald" : undefined}
              style={{ height: `${Math.max(2, Math.round((d.antal / max) * 42))}px`, "--k": k }}
            />
          ))}
        </div>
        <div className="ov-dag-las" aria-live="polite">
          {avlast ? (
            <>
              <span>{dagEtikett(avlast.datum)}</span>
              <span>
                <b>{avlast.antal}</b> {avlast.antal === 1 ? "händelse" : "händelser"}
              </span>
            </>
          ) : (
            <>
              <span>{DAGAR} dagar</span>
              <span>
                <b>{summa}</b> {summa === 1 ? "händelse" : "händelser"}
              </span>
            </>
          )}
        </div>
      </div>

      {logg.length ? (
        <ol className="ov-flode" aria-label="Senaste händelser, nyast först">
          {logg.slice(0, I_FLODET).map((p) => (
            <li key={`${p.ts}|${p.text}`}>
              <span className="ov-avatar" aria-hidden="true" title={p.anvandare}>
                {initialer(p.anvandare)}
              </span>
              <div className="min-w-0">
                <div className="ov-flode-text">{p.text}</div>
                <div className="ov-flode-meta">
                  <time dateTime={p.ts} title={fmtLoggTid(p.ts)}>
                    {fmtRelativ(p.ts, nu)}
                  </time>
                  {p.anvandare ? <span>{p.anvandare}</span> : null}
                  {p.projektId ? <PTag pid={p.projektId} /> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="lead m-0">
          Inga händelser ännu. Statusändringar i alla vyer hamnar här med tid och vem som gjorde dem.
        </p>
      )}

    </Ruta>

    {visaLogg ? (
      <Slideover titel="Ändringslogg" etikett="Hela ändringsloggen" onStang={stang}>
        <Andringslogg kompakt antal={50} rubrik="Alla händelser" />
      </Slideover>
    ) : null}
    </>
  );
}
