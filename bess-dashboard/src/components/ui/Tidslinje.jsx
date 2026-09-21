import { useEffect, useMemo, useRef, useState } from "react";
import { dagarTill, idag, MANADER } from "../../lib/datum.js";
import { harledLage } from "../../lib/berakningar.js";
import { useMedia } from "../../lib/useMedia.js";

/* Interaktiv tidslinje / Gantt.

   Buggfix mot standalone-versionen: där var intervallet hårdkodat till
   2026-09-01–2026-12-31, så allt utanför de fyra månaderna ritades på negativ
   eller >100 % position och försvann ur bild. Här räknas intervallet fram ur
   datan och padas till hela månader.

   Datamodell:
     rader:  [{ id, namn, klass, poster: [...] }]
     post:   { id, datum, slutdatum?, titel, status, typ, ansvarig?, beroende? }
*/

const MS_DAG = 86400000;

/** Färg och etikett per läge. Lägena härleds — 'planerad' som passerat sitt
 *  datum utan att vara klar är i praktiken försenad. */
const LAGE = {
  klar: { prick: "bg-turkos border-turkos", stapel: "bg-turkos/70", text: "Klar" },
  pagaende: { prick: "bg-orange border-orange", stapel: "bg-orange/70", text: "Pågående" },
  forsenad: { prick: "bg-rod border-rod", stapel: "bg-rod/70", text: "Försenad" },
  planerad: { prick: "bg-surface border-one-bla", stapel: "bg-one-bla/60", text: "Planerad" },
};

/* Höjd per körfält i pixlar, och ungefärlig bredd på en markörs etikett i
   procent av spåret. Används bara för att upptäcka kollisioner, inte för layout. */
const KORFALT_H = 30;
const ETIKETT_PROC = 17;

/** Lägger poster i körfält så att de inte täcker varandra.

    Utan detta hamnade två händelser samma datum (t.ex. milstolpen
    "BESS-batteri leverans" och leveransen "BESS-batteri", båda 2026-10-12)
    ovanpå varandra — den undre gick varken att klicka eller läsa. */
function laggIKorfalt(poster, pos) {
  const sistaHogerkant = [];

  return poster.map((p) => {
    const vanster = pos(p.datum) ?? 0;
    const hoger = (p.slutdatum ? (pos(p.slutdatum) ?? vanster) : vanster) + ETIKETT_PROC;

    let korfalt = sistaHogerkant.findIndex((kant) => kant <= vanster);
    if (korfalt === -1) korfalt = sistaHogerkant.length;

    sistaHogerkant[korfalt] = hoger;
    return { ...p, korfalt, vanster, bredd: p.slutdatum ? Math.max((pos(p.slutdatum) ?? vanster) - vanster, 0.6) : null };
  });
}

function manaderMellan(start, slut) {
  const ut = [];
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (d <= slut) {
    ut.push(new Date(d));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return ut;
}

/** Bredd på namnkolumnen. Smalare på telefon, där varje pixel räknas. */
const NAMN_BREDD = 150;
const NAMN_BREDD_LITEN = 104;

export function Tidslinje({ rader, etikett = "Tidslinje", onValjPost, minBredd = 720 }) {
  const [vald, setVald] = useState(null);
  const rullRef = useRef(null);
  const smal = useMedia("(max-width: 640px)");
  const namnBredd = smal ? NAMN_BREDD_LITEN : NAMN_BREDD;

  const modell = useMemo(() => {
    const datum = [];
    rader.forEach((r) =>
      (r.poster || []).forEach((p) => {
        if (p.datum) datum.push(p.datum);
        if (p.slutdatum) datum.push(p.slutdatum);
      })
    );
    if (!datum.length) return null;

    datum.sort();
    // Pada till hela månader, och alltid ta med dagens datum så att
    // "i dag"-linjen hamnar inom bild även när planen ligger bakåt i tiden.
    const alla = [...datum, idag()].sort();
    const forsta = new Date(alla[0] + "T00:00:00Z");
    const sista = new Date(alla[alla.length - 1] + "T00:00:00Z");

    const start = new Date(Date.UTC(forsta.getUTCFullYear(), forsta.getUTCMonth(), 1));
    const slut = new Date(Date.UTC(sista.getUTCFullYear(), sista.getUTCMonth() + 1, 0));
    const span = Math.max(slut - start, MS_DAG);

    const pos = (iso) => {
      const d = new Date(iso + "T00:00:00Z");
      if (Number.isNaN(d.getTime())) return null;
      return Math.max(0, Math.min(100, ((d - start) / span) * 100));
    };

    return { start, slut, pos, manader: manaderMellan(start, slut), idagPos: pos(idag()) };
  }, [rader]);

  /* Rulla fram till i dag när diagrammet är bredare än sin behållare. Annars
     börjar vyn längst till vänster, ofta månader före det som är aktuellt —
     och på telefon hamnar alla markörer utanför bild. */
  useEffect(() => {
    const el = rullRef.current;
    if (!el || !modell || modell.idagPos === null) return;
    const spar = el.scrollWidth - namnBredd;
    const mal = namnBredd + (spar * modell.idagPos) / 100 - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, mal);
  }, [modell, namnBredd]);

  if (!modell) {
    return <p className="lead">Inga daterade händelser att visa på tidslinjen.</p>;
  }

  const valjPost = (post, rad) => {
    const ny = vald?.post?.id === post.id ? null : { post, rad };
    setVald(ny);
    if (onValjPost) onValjPost(ny ? post : null);
  };

  return (
    <div>
      <div
        className="tscroll rounded-sm border border-hairline bg-surface"
        tabIndex={0}
        role="group"
        aria-label={etikett}
        ref={rullRef}
      >
        <div style={{ minWidth: minBredd }} className="relative">
          {/* ---------- Månadsrubriker ---------- */}
          <div className="flex border-b border-hairline" style={{ paddingLeft: namnBredd }}>
            {modell.manader.map((m) => (
              <div
                key={m.toISOString()}
                className="flex-1 border-l border-hairline px-2 py-2 text-[11px] font-bold uppercase tracking-[.06em] text-ink-faint"
              >
                {MANADER[m.getUTCMonth()]}
                <span className="ml-1 opacity-60">{String(m.getUTCFullYear()).slice(2)}</span>
              </div>
            ))}
          </div>

          <div className="relative">
            {/* ---------- I dag-linje ----------
                Ligger i ett eget lager som börjar där spåren börjar, så att
                left:% räknas i exakt samma koordinatsystem som markörerna.
                Tidigare låg den på calc(150px + (100% - 150px) * x) i den yttre
                behållaren — och när diagrammet var bredare än behållaren (alltid
                på telefon) syftade 100% på behållaren, inte på spåret. Linjen
                hamnade då på fel datum. */}
            {modell.idagPos !== null && (
              <div
                className="pointer-events-none absolute bottom-0 right-0 top-0 z-[3]"
                style={{ left: namnBredd }}
              >
                <div
                  className="absolute bottom-0 top-0 w-0.5 bg-rod"
                  style={{ left: `${modell.idagPos}%` }}
                >
                  <b className="absolute left-1 top-1 whitespace-nowrap rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-rod shadow-sm">
                    i dag
                  </b>
                </div>
              </div>
            )}

            {/* ---------- Rader ---------- */}
            {rader.map((rad) => {
              const poster = laggIKorfalt(
                [...(rad.poster || [])].filter((p) => p.datum).sort((a, b) => a.datum.localeCompare(b.datum)),
                modell.pos
              );
              const antalFalt = poster.reduce((n, p) => Math.max(n, p.korfalt + 1), 1);
              const radHojd = Math.max(92, antalFalt * KORFALT_H + 20);

              return (
                <div key={rad.id} className="border-b border-hairline last:border-b-0">
                  <div className="flex items-stretch">
                    <div
                      className="shrink-0 border-r border-hairline px-3 py-3"
                      style={{ width: namnBredd }}
                    >
                      <div className="text-[12px] font-bold leading-tight text-one-djup">{rad.namn}</div>
                      <div className="mt-0.5 text-[11px] text-ink-faint">
                        {poster.length} {poster.length === 1 ? "händelse" : "händelser"}
                      </div>
                    </div>

                    <div className="relative flex-1" style={{ minHeight: radHojd }}>
                      {/* Månadsrutnät */}
                      <div className="pointer-events-none absolute inset-0 flex">
                        {modell.manader.map((m) => (
                          <div key={m.toISOString()} className="flex-1 border-l border-hairline/60" />
                        ))}
                      </div>

                      {poster.map((p) => {
                        const lage = harledLage(p);
                        const stil = LAGE[lage];
                        const arVald = vald?.post?.id === p.id;
                        const dagar = dagarTill(p.slutdatum || p.datum);

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => valjPost(p, rad)}
                            aria-pressed={arVald}
                            aria-label={`${p.titel}, ${p.datum}${p.slutdatum ? ` till ${p.slutdatum}` : ""}, ${
                              stil.text
                            }, ${rad.namn}. ${
                              dagar === null ? "" : dagar < 0 ? `${Math.abs(dagar)} dagar sedan` : `${dagar} dagar kvar`
                            }`}
                            title={`${p.titel} · ${p.datum}`}
                            className={`absolute z-[2] flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border py-0.5 pl-0.5 pr-2 text-left transition-shadow hover:z-[4] hover:shadow-md focus-visible:z-[4] ${
                              arVald
                                ? "z-[4] border-one-bla bg-info-bg shadow-md"
                                : "border-hairline bg-surface"
                            }`}
                            style={{
                              left: `${p.vanster}%`,
                              top: p.korfalt * KORFALT_H + 10,
                              height: 24,
                              width: p.bredd !== null ? `${p.bredd}%` : undefined,
                              minWidth: p.bredd !== null ? 40 : undefined,
                              maxWidth: 190,
                              marginLeft: -7,
                            }}
                          >
                            {/* Prick eller stapel beroende på om posten har ett spann */}
                            {p.bredd !== null ? (
                              <span className={`h-3 flex-1 rounded-full ${stil.stapel}`} />
                            ) : (
                              <>
                                <span
                                  className={`h-3 w-3 shrink-0 rounded-full border-2 ${stil.prick}`}
                                  aria-hidden="true"
                                />
                                <b className="shrink-0 font-head text-[10px] tabular-nums text-one-djup">
                                  {p.datum.slice(5).replace("-", "/")}
                                </b>
                                <span className="truncate text-[10.5px] text-ink-soft">{p.titel}</span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- Teckenförklaring ---------- */}
      <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-ink-soft">
        {Object.entries(LAGE).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <i className={`inline-block h-2.5 w-2.5 rounded-full border-2 ${v.prick}`} />
            {v.text}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-0.5 bg-rod" />i dag
        </span>
      </div>

      {/* ---------- Detaljvy ---------- */}
      {vald ? <Detaljpanel post={vald.post} rad={vald.rad} onStang={() => setVald(null)} /> : null}
    </div>
  );
}

function Detaljpanel({ post, rad, onStang }) {
  const lage = harledLage(post);
  const dagar = dagarTill(post.slutdatum || post.datum);

  const falt = [
    ["Projekt", rad.namn],
    ["Typ", post.typ || "Milstolpe"],
    ["Startdatum", post.datum],
    post.slutdatum ? ["Slutdatum", post.slutdatum] : null,
    ["Läge", LAGE[lage].text],
    [
      "Tidsmarginal",
      dagar === null ? "—" : dagar < 0 ? `${Math.abs(dagar)} dagar försenad` : `${dagar} dagar kvar`,
    ],
    post.ansvarig ? ["Ansvarig", post.ansvarig] : null,
    post.leverantor ? ["Leverantör", post.leverantor] : null,
    post.beroende ? ["Beroende", post.beroende] : null,
  ].filter(Boolean);

  return (
    <div
      className="mt-4 rounded-card border border-one-bla bg-surface p-5 shadow-md"
      role="region"
      aria-label={`Detaljer för ${post.titel}`}
      // tabIndex så att fokus kan flyttas hit av skärmläsare vid behov
      tabIndex={-1}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-head text-[16px] font-bold text-ink">{post.titel}</h4>
          <p className="mt-1 text-[12.5px] text-ink-soft">{rad.namn}</p>
        </div>
        <button type="button" className="btn sec mini" onClick={onStang}>
          Stäng
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
        {falt.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[10.5px] font-bold uppercase tracking-[.06em] text-ink-faint">{k}</dt>
            <dd className="mt-0.5 break-words text-[13px] text-ink">{v || "—"}</dd>
          </div>
        ))}
      </dl>

      {post.anteckning ? (
        <p className="mt-3 border-t border-hairline pt-3 text-[13px] leading-relaxed text-ink-soft">
          {post.anteckning}
        </p>
      ) : null}
    </div>
  );
}
