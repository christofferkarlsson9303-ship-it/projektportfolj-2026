import { useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { fmtSEK } from "../../lib/format.js";
import { KOLUMNER, flagga, kolumnFor, slappAtgard } from "./flode.js";

/* Kanban över ÄTA-flödet i ABT 06. Kolumnmodellen ligger i flode.js.

   stangd och utgar har ingen kolumn. De filtreras bort och räknas i stället
   upp under tavlan, så att poster aldrig försvinner tyst. */

function Kort({ u, projektNamn, vald, onOppna, onDragStart }) {
  const f = flagga(u);

  return (
    <article
      className={`atakort${vald ? " vald" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, u.id)}
    >
      <button type="button" className="atakort-yta" onClick={() => onOppna(u.id)} aria-expanded={vald}>
        <span className="atakort-topp">
          <span className="atakort-nr">{u.nr}</span>
          {f ? (
            <span className={`atabadge ${f.niva}`} title={f.txt}>
              <span aria-hidden="true">{f.ikon}</span>
              <span className="sr-only">{f.txt}</span>
            </span>
          ) : null}
        </span>
        <span className="atakort-titel">{u.benamning || "Utan benämning"}</span>
        <span className="atakort-fot">
          <span>{projektNamn}</span>
          <span className="atakort-belopp">{u.belopp ? fmtSEK(u.belopp) : "—"}</span>
        </span>
      </button>
    </article>
  );
}

export function AtaKanbanView({ rader, projektNamn, vald, onOppna, onVisaTabell }) {
  const { uppd, uppdStatus } = usePortfolj();
  const { visaToast } = useUi();
  const [over, setOver] = useState(null);

  const avslutade = rader.filter((u) => kolumnFor(u) === null);

  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e, kolumn) => {
    e.preventDefault();
    setOver(null);

    const id = e.dataTransfer.getData("text/plain");
    const u = rader.find((r) => r.id === id);
    if (!u || kolumnFor(u) === kolumn) return;

    const atgard = slappAtgard(u, kolumn);
    if (!atgard) return;

    // Fälten först, så att grindarna räknar rätt redan när statusen loggas.
    for (const [falt, varde] of Object.entries(atgard.falt)) uppd("ur", u.id, falt, varde);

    if (atgard.status !== u.status) {
      uppdStatus("ur", u.id, "status", atgard.status);
    } else if (Object.keys(atgard.falt).length) {
      visaToast(
        atgard.falt.underrattelseDatum === ""
          ? "Underrättelsedatum rensat — fyll i på nytt om det var fel"
          : "Underrättelse stämplad " + atgard.falt.underrattelseDatum
      );
    }
  };

  return (
    <div className="atatavla-yta">
      <div className="atatavla" role="list" aria-label="ÄTA-flödet">
        {KOLUMNER.map(([id, namn, hjalp]) => {
          const poster = rader.filter((u) => kolumnFor(u) === id);
          const larm = poster.filter((u) => flagga(u)?.niva === "rod").length;

          return (
            <section
              key={id}
              role="listitem"
              className={`atakolumn${over === id ? " over" : ""}`}
              aria-label={`${namn} — ${poster.length} poster`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (over !== id) setOver(id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOver(null);
              }}
              onDrop={(e) => onDrop(e, id)}
            >
              <header className="atakolumn-topp">
                <h4 title={hjalp}>{namn}</h4>
                <span className="atakolumn-antal">
                  {poster.length}
                  {larm ? <span className="atakolumn-larm" title={`${larm} larmar`} /> : null}
                </span>
              </header>

              <div className="atakolumn-kropp">
                {poster.map((u) => (
                  <Kort
                    key={u.id}
                    u={u}
                    projektNamn={projektNamn}
                    vald={vald === u.id}
                    onOppna={onOppna}
                    onDragStart={onDragStart}
                  />
                ))}
                {poster.length === 0 ? <p className="atakolumn-tom">Inget här</p> : null}
              </div>
            </section>
          );
        })}
      </div>

      <p className="lead atatavla-fot">
        Dra ett kort för att flytta det — ändringen sparas direkt. Med tangentbord byter du läge i
        ärendepanelen i stället.
        {avslutade.length ? (
          <>
            {" "}
            {avslutade.length} stängd{avslutade.length > 1 ? "a" : ""} eller utgången post visas inte på
            tavlan.{" "}
            <button type="button" className="lankknapp" onClick={onVisaTabell}>
              Visa alla i tabellen
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}
