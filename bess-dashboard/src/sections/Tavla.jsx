import { useCallback, useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Note } from "../components/ui/Primitiver.jsx";
import { PTag } from "../components/ui/PTag.jsx";
import { KANBAN, KOLUMNER, ROLLER } from "../data/konstanter.js";
import { dagarTill } from "../lib/datum.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

/* Ansvarig roll: satt värde vinner, annars härleds den ur ägare/leverantör.
   Härledningen är en gissning — ändra på kortet när den blir fel. */
function harledRoll(rad) {
  if (rad.roll) return rad.roll;
  const t = `${rad.agare || ""} ${rad.leverantor || ""} ${rad.till || ""}`.toLowerCase();
  if (/energi|vexnet|nätägare|natagare|kraftnät/.test(t)) return "Nätägare";
  if (/ingrid|beställare|bestallare|young|gyllenklo|medina/.test(t)) return "Beställare";
  if (/harju|cramo|elleholm|a-bygg|jinert|catl|flexgen|veo|mekan|vinnergi/.test(t)) return "UE";
  return "PL";
}

function kortTitel(lista, rad) {
  if (lista === "hseqavvikelser") return rad.text || rad.titel || "Rondavvikelse";
  if (lista === "ur") return (rad.nr ? rad.nr + " — " : "") + (rad.benamning || "");
  if (lista === "punkter") return rad.titel || "";
  if (lista === "storningar") return (rad.nr ? rad.nr + " — " : "") + (rad.rubrik || rad.rutaD || "Störning");
  return rad.titel || rad.benamning || "";
}

/* ---------- Kort ---------- */

function Kanbankort({ k, onFlytta, onRoll, onDragStart, onDragEnd, dras }) {
  const forfaller = k.rad.forfaller ? dagarTill(k.rad.forfaller) : null;
  const dlKlass =
    forfaller !== null && forfaller < 0 ? "p-bad" : forfaller !== null && forfaller <= 7 ? "p-warn" : "p-wait";

  return (
    <li
      className={`kcard t-${k.lista} ${dras ? "dragging" : ""}`.trim()}
      draggable
      onDragStart={(e) => onDragStart(e, k.lista, k.rad.id)}
      onDragEnd={onDragEnd}
    >
      <div className="ktop">
        <span className="ktyp">{KANBAN[k.lista].namn}</span>
        <PTag pid={k.rad.projektId} />
      </div>

      <div className="ktitel">{k.titel}</div>

      {k.rad.agare || k.rad.forfaller ? (
        <div className="kmeta">
          {k.rad.agare ? <span>{k.rad.agare}</span> : null}
          {k.rad.forfaller ? <span className={`pill ${dlKlass}`}>{k.rad.forfaller}</span> : null}
        </div>
      ) : null}

      <div className="krad">
        {/* Väljarna är också tangentbordsvägen att flytta ett kort —
            drag & drop ensamt är otillgängligt. */}
        <select
          value={k.roll}
          onChange={(e) => onRoll(k.lista, k.rad.id, e.target.value)}
          aria-label={`Ansvarig roll för ${k.titel}`}
        >
          {ROLLER.map((r) => (
            <option value={r} key={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={k.kol}
          onChange={(e) => onFlytta(k.lista, k.rad.id, e.target.value)}
          aria-label={`Flytta ${k.titel} till kolumn`}
        >
          {KOLUMNER.map(([kk, nn]) => (
            <option value={kk} key={kk}>
              {nn}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}

/* Filterväljare. Buggfix: den här låg tidigare som en funktionskomponent inuti
   Tavla, vilket gjorde att React monterade om <select> vid varje omrendering —
   fokus försvann mitt i att man valde. Deklarerad utanför render behålls den. */
function Valj({ vilket, etikett, alt, varde, onValj }) {
  return (
    <div className="f">
      <label htmlFor={`tf-${vilket}`}>{etikett}</label>
      <select id={`tf-${vilket}`} value={varde} onChange={(e) => onValj(vilket, e.target.value)}>
        {alt.map(([v, n]) => (
          <option value={v} key={v}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- Sektionen ---------- */

export function Tavla() {
  const { state, dispatch, uppd, uppdStatus } = usePortfolj();
  const { valtProjekt, fraga, visaToast } = useUi();

  const [filter, setFilter] = useState({ projekt: "alla", roll: "alla", typ: "alla" });
  const satFilter = useCallback((vilket, varde) => setFilter((f) => ({ ...f, [vilket]: varde })), []);
  const [dragKort, setDragKort] = useState(null);
  const [overKol, setOverKol] = useState(null);

  const rader = useMemo(() => {
    const ut = [];

    // Rondavvikelser är nästlade i hseqRonder — platta ut dem till korttyper.
    const avvikelser = [];
    (state.hseqRonder || []).forEach((r) =>
      (r.avvikelser || []).forEach((a) =>
        avvikelser.push({
          ...a,
          projektId: r.projektId,
          rondId: r.id,
          titel: a.text || "Rondavvikelse",
          agare: a.ansvarig,
          forfaller: a.senast,
        })
      )
    );

    for (const lista of Object.keys(KANBAN)) {
      const kalla = lista === "hseqavvikelser" ? avvikelser : state[lista] || [];
      for (const rad of kalla) {
        ut.push({
          lista,
          rad,
          kol: KANBAN[lista].fran[rad.status] || "pagar",
          roll: harledRoll(rad),
          titel: kortTitel(lista, rad),
        });
      }
    }

    return ut.filter((k) => {
      if (filter.typ !== "alla" && k.lista !== filter.typ) return false;
      if (filter.roll !== "alla" && k.roll !== filter.roll) return false;
      if (filter.projekt !== "alla") {
        const pid = k.rad.projektId;
        if (pid !== filter.projekt && pid !== "bada") return false;
      }
      return true;
    });
  }, [state, filter]);

  const flyttaKort = (lista, id, kol) => {
    const karta = KANBAN[lista];
    if (!karta) return;
    const ny = karta.till[kol];
    if (!ny) return;

    if (lista === "hseqavvikelser") {
      dispatch({ type: "UPPD_RONDAVVIKELSE", id, falt: "status", varde: ny });
    } else {
      uppdStatus(lista, id, "status", ny);
    }
    const kolnamn = (KOLUMNER.find((k) => k[0] === kol) || [undefined, kol])[1];
    visaToast(`Flyttad till ”${kolnamn}” och loggad`);
  };

  const sattRoll = (lista, id, roll) => {
    if (lista === "hseqavvikelser") dispatch({ type: "UPPD_RONDAVVIKELSE", id, falt: "roll", varde: roll });
    else uppd(lista, id, "roll", roll);
  };

  const nyUppgift = async (kol) => {
    const kolnamn = (KOLUMNER.find((k) => k[0] === kol) || [undefined, kol])[1];
    const sv = await fraga({
      titel: "Ny uppgift",
      lead: `Hamnar i kolumnen ”${kolnamn}”.`,
      falt: [
        {
          namn: "titel",
          etikett: "Beskriv uppgiften",
          typ: "textarea",
          placeholder: "t.ex. Beställ kabelskydd till schakt B",
        },
        { namn: "forfaller", etikett: "Förfaller (valfritt)", typ: "date" },
      ],
      ok: "Lägg till",
    });
    if (!sv || !sv.titel?.trim()) return;

    const pid = filter.projekt !== "alla" ? filter.projekt : valtProjekt;
    const titel = sv.titel.trim();

    dispatch({
      type: "LAGG_TILL",
      lista: "punkter",
      rad: {
        id: "p" + Date.now(),
        projektId: pid,
        titel,
        agare: hamtaNamn() || "Christoffer Karlsson",
        forfaller: sv.forfaller || "",
        status: KANBAN.punkter.till[kol] || "oppen",
        roll: "",
      },
    });
    dispatch({ type: "LOGGA", projektId: pid, text: `Uppgift skapad på tavlan: ${titel}` });

    if (filter.typ !== "alla" && filter.typ !== "punkter") setFilter((f) => ({ ...f, typ: "alla" }));
    visaToast(`Uppgiften tillagd i ”${kolnamn}”`);
  };

  return (
    <>
      <div className="card">
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>Tavla — ÄTA/UR, uppgifter och avvikelser</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              Dra ett kort mellan kolumnerna, eller använd menyn på kortet. Varje flytt sätter radens
              riktiga status och skrivs in i ändringsloggen.
            </div>
          </div>
          <div className="kortverktyg">
            <button type="button" className="btn mini" onClick={() => nyUppgift("ej")}>
              + Ny uppgift
            </button>
          </div>
        </div>

        <div className="kfilter">
          <Valj
            vilket="projekt"
            etikett="Projekt"
            varde={filter.projekt}
            onValj={satFilter}
            alt={[["alla", "Alla projekt"], ...state.projekt.map((p) => [p.id, (p.nr ? p.nr + " " : "") + p.namn])]}
          />
          <Valj
            vilket="roll"
            etikett="Ansvarig"
            varde={filter.roll}
            onValj={satFilter}
            alt={[["alla", "Alla roller"], ...ROLLER.map((r) => [r, r])]}
          />
          <Valj
            vilket="typ"
            etikett="Typ"
            varde={filter.typ}
            onValj={satFilter}
            alt={[
              ["alla", "Allt"],
              ["ur", "ÄTA / UR"],
              ["punkter", "Uppgifter"],
              ["storningar", "Avvikelser"],
            ]}
          />
          <div className="f">
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }} role="status">
              {rader.length} kort
            </span>
          </div>
        </div>
      </div>

      <div className="kboard" style={{ marginTop: 16 }}>
        {KOLUMNER.map(([kol, namn]) => {
          const i = rader.filter((r) => r.kol === kol);
          return (
            <section
              className={`kcol ${overKol === kol ? "over" : ""}`.trim()}
              key={kol}
              role="region"
              aria-label={`${namn} — ${i.length} kort`}
              onDragOver={(e) => {
                e.preventDefault();
                try {
                  e.dataTransfer.dropEffect = "move";
                } catch {
                  /* vissa webbläsare tillåter inte att sätta dropEffect här */
                }
                setOverKol(kol);
              }}
              onDragLeave={() => setOverKol((k) => (k === kol ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                setOverKol(null);
                let d = dragKort;
                if (!d) {
                  let txt = "";
                  try {
                    txt = e.dataTransfer.getData("text/plain") || "";
                  } catch {
                    txt = "";
                  }
                  const bit = txt.split("|");
                  if (bit.length === 2) d = { lista: bit[0], id: bit[1] };
                }
                setDragKort(null);
                if (d) flyttaKort(d.lista, d.id, kol);
              }}
            >
              <div className="kcolh">
                <b>{namn}</b>
                <span className="kspace" />
                <span className="kcount">{i.length}</span>
                <button
                  type="button"
                  className="kplus"
                  title={`Ny uppgift i ${namn}`}
                  aria-label={`Ny uppgift i ${namn}`}
                  onClick={() => nyUppgift(kol)}
                >
                  +
                </button>
              </div>

              {i.length ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {i.map((k) => (
                    <Kanbankort
                      key={`${k.lista}-${k.rad.id}`}
                      k={k}
                      dras={dragKort?.id === k.rad.id}
                      onFlytta={flyttaKort}
                      onRoll={sattRoll}
                      onDragStart={(e, lista, id) => {
                        setDragKort({ lista, id });
                        try {
                          e.dataTransfer.setData("text/plain", `${lista}|${id}`);
                          e.dataTransfer.effectAllowed = "move";
                        } catch {
                          /* drag fungerar ändå via komponentens eget state */
                        }
                      }}
                      onDragEnd={() => setDragKort(null)}
                    />
                  ))}
                </ul>
              ) : (
                <div className="ktom">Inga kort.</div>
              )}

              <button type="button" className="kadd" onClick={() => nyUppgift(kol)}>
                + Ny uppgift
              </button>
            </section>
          );
        })}
      </div>

      <Note>
        <b>Om ansvarig roll.</b> Rollen härleds ur ägare/leverantör när den inte är satt — det är en
        gissning, inte hämtat ur underlaget. Ändra den på kortet så sparas den.
      </Note>
    </>
  );
}
