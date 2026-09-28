import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleDot,
  Flag,
  Layers,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { dagarTill, idag, isoVecka, MANADER } from "../../lib/datum.js";
import { harledLage } from "../../lib/berakningar.js";
import { useMedia } from "../../lib/useMedia.js";
import { Vyvaljare } from "./Vyvaljare.jsx";

/* Gantt-schema — tidsstaplar per projekt i kollapsbara spår.

   Varje post har en egen rad: vänster en fast namnkolumn, höger en stapel
   från start till slut (eller en romb för en händelse på ett enda datum).
   Bakom ligger ett kalenderrutnät för dagar, veckor, månader eller kvartal
   beroende på zoom, och en framträdande i dag-linje med tagg.

   Datamodell:
     rader:  [{ id, namn, grupper?: [{ id, namn, poster }], poster? }]
     post:   { id, titel, datum, slutdatum?, status?, lage?, typ?, ansvarig?,
               leverantor?, anteckning? }
   `datum` är start, `slutdatum` slut. Utan slutdatum är posten en händelse.
   `lage` sätts av anroparen när läget redan är känt (t.ex. en byggfas);
   annars härleds det ur status och datum.

   Status bärs av färg, ikon och text tillsammans — aldrig av färgen ensam.
   Tonerna är designsystemets: Klar i Blågrön, Pågående i ONE Blå, Försenad
   i rött, Planerad i grått. Staplarna är tonade (18 %) med kant och ikon i
   full färg, så att texten i dem klarar kontrastkraven i båda lägena. */

const MS_DAG = 86400000;

const LAGE = {
  klar: { text: "Klar", farg: "var(--turkos)", ink: "var(--ok-ink)", ikon: CircleCheck },
  pagaende: { text: "Pågående", farg: "var(--one-bla)", ink: "var(--info-ink)", ikon: CircleDot },
  forsenad: { text: "Försenad", farg: "var(--rod)", ink: "var(--bad-ink)", ikon: TriangleAlert },
  planerad: { text: "Planerad", farg: "var(--ink-faint)", ink: "var(--ink-soft)", ikon: Circle },
};

/** Pixlar per dag för varje zoomnivå. */
const ZOOM = {
  dag: { px: 40, namn: "Dag" },
  vecka: { px: 16, namn: "Vecka" },
  manad: { px: 5, namn: "Månad" },
  kvartal: { px: 1.8, namn: "Kvartal" },
};

const TYPIKON = { Byggfas: Layers, Milstolpe: Flag, Leverans: Truck };

const HUVUD_OVRE = 24;
const HUVUD_NEDRE = 24;
const SPAR_H = 44;
const GRUPP_H = 28;
const RAD_H = 36;
const STAPEL_H = 22;

const utc = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
const langtDatum = (iso) => {
  const d = new Date(utc(iso));
  return `${d.getUTCDate()} ${MANADER[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const kortDatum = (iso) => {
  const d = new Date(utc(iso));
  return `${d.getUTCDate()} ${MANADER[d.getUTCMonth()]}`;
};
const tonad = (farg, andel = 18) => `color-mix(in srgb, ${farg} ${andel}%, var(--surface))`;

/** Start och slut för en post, i ordning. Utan slutdatum är start = slut. */
function spann(p) {
  const a = p.datum;
  const b = giltigt(p.slutdatum) ? p.slutdatum : p.datum;
  return a <= b ? [a, b] : [b, a];
}

/** Läget för en post. En stapel som pågår i dag är Pågående även om ingen
 *  har satt den statusen — det följer av datumen. */
function lageFor(p) {
  if (p.lage) return p.lage;
  const l = harledLage(p);
  const [a, b] = spann(p);
  if (l === "planerad" && a !== b && a <= idag() && idag() <= b) return "pagaende";
  return l;
}

const allaPoster = (rad) =>
  (rad.grupper ? rad.grupper.flatMap((g) => g.poster || []) : rad.poster || []).filter((p) => giltigt(p.datum));

/** Kalenderns enheter mellan start och slut (exklusivt). */
function kalender(start, slut) {
  const dagar = [];
  const veckor = [];
  const manader = [];
  const kvartal = [];
  for (let t = start; t < slut; t += MS_DAG) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    dagar.push({ t, dag: d.getUTCDate(), dow });
    if (dow === 1) {
      const lokal = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      veckor.push({ t, nr: Number(isoVecka(lokal).split("-v")[1]) });
    }
    if (d.getUTCDate() === 1) {
      manader.push({ t, m: d.getUTCMonth(), y: d.getUTCFullYear() });
      if (d.getUTCMonth() % 3 === 0) kvartal.push({ t, q: d.getUTCMonth() / 3 + 1, y: d.getUTCFullYear() });
    }
  }
  return { dagar, veckor, manader, kvartal };
}

/** Band i rubriken: position, bredd och etikett för varje enhet. */
function band(enheter, slut, x, etikett) {
  return enheter.map((e, i) => {
    const nasta = i + 1 < enheter.length ? enheter[i + 1].t : slut;
    return { key: e.t, x: x(e.t), w: x(nasta) - x(e.t), text: etikett(e) };
  });
}

const VECKODAG = ["S", "M", "T", "O", "T", "F", "L"];

export function Tidslinje({ rader, etikett = "Tidslinje", onValjPost, redigera, standardZoom = "manad" }) {
  const [zoom, setZoom] = useState(standardZoom);
  const [hopfallda, setHopfallda] = useState(() => new Set());
  const [vald, setVald] = useState(null);
  const [tips, setTips] = useState(null);
  const rullRef = useRef(null);
  const ramRef = useRef(null);
  const tipsMal = useRef(null);
  const smal = useMedia("(max-width: 640px)");
  const namnBredd = smal ? 136 : 232;
  const nu = idag();

  const modell = useMemo(() => {
    const datum = [];
    rader.forEach((r) =>
      allaPoster(r).forEach((p) => {
        const [a, b] = spann(p);
        datum.push(a, b);
      })
    );
    if (!datum.length) return null;
    datum.push(nu);
    datum.sort();

    const pad = zoom === "dag" ? 7 : zoom === "vecka" ? 14 : 21;
    const f = new Date(utc(datum[0]) - pad * MS_DAG);
    const s = new Date(utc(datum[datum.length - 1]) + pad * MS_DAG);
    const kv = zoom === "kvartal";
    const start = Date.UTC(f.getUTCFullYear(), kv ? Math.floor(f.getUTCMonth() / 3) * 3 : f.getUTCMonth(), 1);
    const slut = Date.UTC(s.getUTCFullYear(), kv ? Math.floor(s.getUTCMonth() / 3) * 3 + 3 : s.getUTCMonth() + 1, 1);

    const px = ZOOM[zoom].px;
    const x = (t) => ((t - start) / MS_DAG) * px;
    const xIso = (iso) => x(utc(iso));
    const k = kalender(start, slut);

    const manadBand = band(k.manader, slut, x, (e) => `${MANADER[e.m]} ${e.y}`);
    const ovre =
      zoom === "kvartal" ? band(k.kvartal, slut, x, (e) => `Q${e.q} ${e.y}`) : manadBand;
    const nedre =
      zoom === "dag"
        ? band(k.dagar, slut, x, (e) => `${VECKODAG[e.dow]} ${e.dag}`)
        : zoom === "vecka"
          ? band(k.veckor, slut, x, (e) => `v. ${e.nr}`)
          : zoom === "manad"
            ? band(k.veckor, slut, x, (e) => String(e.nr))
            : band(k.manader, slut, x, (e) => MANADER[e.m]);

    // Rutnät: tunna linjer för den fina enheten, tydligare för den grova.
    const fin = (zoom === "dag" ? k.dagar : zoom === "kvartal" ? k.manader : k.veckor).map((e) => x(e.t));
    const grov = (zoom === "dag" ? k.veckor : zoom === "kvartal" ? k.kvartal : k.manader).map((e) => x(e.t));
    const helger = zoom === "dag" ? k.dagar.filter((e) => e.dow === 0 || e.dow === 6).map((e) => x(e.t)) : [];

    return { start, slut, px, bredd: x(slut), xIso, ovre, nedre, fin, grov, helger, idagX: xIso(nu) };
  }, [rader, zoom, nu]);

  /* Visa dagens datum en bit in i bild när diagrammet ritas eller zoomen
     byts — annars börjar vyn i planens början, ofta månader bakåt. */
  const idagX = modell ? modell.idagX : null;
  const rullaTillIdag = (mjukt = false) => {
    const el = rullRef.current;
    if (!el || idagX === null) return;
    const mal = idagX - (el.clientWidth - namnBredd) * 0.35;
    el.scrollTo({ left: Math.max(0, mal), behavior: mjukt ? "smooth" : "auto" });
  };
  useLayoutEffect(() => {
    const el = rullRef.current;
    if (!el || idagX === null) return;
    el.scrollLeft = Math.max(0, idagX - (el.clientWidth - namnBredd) * 0.35);
  }, [idagX, namnBredd]);

  if (!modell) {
    return <p className="m-0 text-[13px] text-ink-soft">Inga daterade händelser att visa på tidslinjen.</p>;
  }

  const hittaPost = (v) => {
    if (!v) return null;
    const rad = rader.find((r) => r.id === v.radId);
    const post = rad ? allaPoster(rad).find((p) => p.id === v.postId) : null;
    return post ? { post, rad } : null;
  };
  const valt = hittaPost(vald);
  const tipsPost = hittaPost(tips);

  const valjPost = (post, rad) => {
    const ar = vald?.postId === post.id && vald?.radId === rad.id;
    setVald(ar ? null : { postId: post.id, radId: rad.id });
    if (onValjPost) onValjPost(ar ? null : post);
  };

  /* Verktygstipset följer stapeln när diagrammet rullas — fokus med Tab
     rullar stapeln i bild, och då ska tipset flytta med i stället för att
     försvinna. Rullas stapeln ur den synliga tidsytan döljs det. */
  const placeraTips = (el, post, rad) => {
    const ram = ramRef.current?.getBoundingClientRect();
    const rull = rullRef.current?.getBoundingClientRect();
    if (!ram || !rull) return;
    const r = el.getBoundingClientRect();
    const synligV = Math.max(r.left, rull.left + namnBredd);
    const synligH = Math.min(r.right, rull.right);
    if (!el.isConnected || synligH < synligV) {
      setTips(null);
      return;
    }
    const mitt = (synligV + Math.min(synligH, synligV + 220)) / 2 - ram.left;
    const under = r.top - ram.top < 150;
    setTips({
      postId: post.id,
      radId: rad.id,
      x: Math.max(160, Math.min(mitt, ram.width - 160)),
      y: under ? r.bottom - ram.top + 8 : r.top - ram.top - 8,
      under,
    });
  };
  const visaTips = (e, post, rad) => {
    tipsMal.current = { el: e.currentTarget, post, rad };
    placeraTips(e.currentTarget, post, rad);
  };
  const doljTips = () => {
    tipsMal.current = null;
    setTips(null);
  };

  const vaxla = (id) =>
    setHopfallda((s) => {
      const ny = new Set(s);
      if (ny.has(id)) ny.delete(id);
      else ny.add(id);
      return ny;
    });
  const allaHopfallda = rader.every((r) => hopfallda.has(r.id));

  /* Platta ut spår, grupper och poster till rader i ordning. */
  const synliga = [];
  rader.forEach((rad) => {
    const poster = allaPoster(rad);
    synliga.push({ typ: "spar", rad, poster });
    if (hopfallda.has(rad.id)) return;
    const grupper = rad.grupper || [{ id: "alla", namn: null, poster: rad.poster || [] }];
    let nagon = false;
    grupper.forEach((g) => {
      const gp = (g.poster || []).filter((p) => giltigt(p.datum)).sort((a, b) => a.datum.localeCompare(b.datum));
      if (!gp.length) return;
      nagon = true;
      if (g.namn) synliga.push({ typ: "grupp", rad, grupp: g, antal: gp.length });
      gp.forEach((p) => synliga.push({ typ: "post", rad, post: p }));
    });
    if (!nagon) synliga.push({ typ: "tom", rad });
  });

  const tidsbredd = modell.bredd;
  const helbredd = namnBredd + tidsbredd;
  const tipsId = "gantt-tips";

  return (
    <div className="relative flex flex-col gap-3" ref={ramRef}>
      {/* ---------- Verktyg ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <Vyvaljare
          etikett="Zoom"
          varde={zoom}
          onValj={(v) => {
            doljTips();
            setZoom(v);
          }}
          alternativ={Object.entries(ZOOM).map(([k, z]) => [k, z.namn])}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="btn sec mini"
            onClick={() => setHopfallda(allaHopfallda ? new Set() : new Set(rader.map((r) => r.id)))}
          >
            {allaHopfallda ? "Fäll ut alla" : "Fäll ihop alla"}
          </button>
          <button type="button" className="btn sec mini" onClick={() => rullaTillIdag(true)}>
            Till i dag
          </button>
        </div>
      </div>

      {/* ---------- Diagrammet ---------- */}
      <div
        className="tscroll relative rounded-lg border border-solid border-hairline bg-surface !overflow-x-auto"
        tabIndex={0}
        role="group"
        aria-label={etikett}
        ref={rullRef}
        onScroll={() => {
          const m = tipsMal.current;
          if (m) placeraTips(m.el, m.post, m.rad);
        }}
      >
        <div className="relative" style={{ width: helbredd }}>
          {/* Rutnät, helger och i dag-linje ligger bakom raderna, i spårens
              koordinater: x = 0 är tidsaxelns början. */}
          <div
            className="pointer-events-none absolute bottom-0 top-0"
            style={{ left: namnBredd, width: tidsbredd }}
            aria-hidden="true"
          >
            {modell.helger.map((x) => (
              <div
                key={`h${x}`}
                className="absolute bottom-0 bg-sunken"
                style={{ left: x, width: modell.px, top: HUVUD_OVRE + HUVUD_NEDRE }}
              />
            ))}
            {modell.fin.map((x) => (
              <div
                key={`f${x}`}
                className="absolute bottom-0 w-px"
                style={{ left: x, top: HUVUD_OVRE, background: "color-mix(in srgb, var(--hairline) 70%, transparent)" }}
              />
            ))}
            {modell.grov.map((x) => (
              <div key={`g${x}`} className="absolute bottom-0 top-0 w-px bg-hairline-stark" style={{ left: x }} />
            ))}
          </div>

          {/* ---------- Tidsaxel ---------- */}
          <div className="relative flex border-0 border-b border-solid border-hairline-stark">
            <div
              className="sticky left-0 z-[7] flex shrink-0 items-end overflow-hidden whitespace-nowrap border-0 border-r border-solid border-hairline bg-surface px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft"
              style={{ width: namnBredd, height: HUVUD_OVRE + HUVUD_NEDRE }}
            >
              {smal ? "Händelse" : "Projekt och händelse"}
            </div>
            <div className="relative" style={{ width: tidsbredd, height: HUVUD_OVRE + HUVUD_NEDRE }}>
              {modell.ovre.map((b) => (
                <div
                  key={`o${b.key}`}
                  className="absolute top-0 overflow-hidden whitespace-nowrap px-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink"
                  style={{ left: b.x, width: b.w, height: HUVUD_OVRE }}
                >
                  {b.text}
                </div>
              ))}
              {modell.nedre.map((b) => (
                <div
                  key={`n${b.key}`}
                  className={`absolute overflow-hidden whitespace-nowrap text-[10.5px] tabular-nums text-ink-soft ${
                    zoom === "dag" ? "text-center" : "px-1.5"
                  }`}
                  style={{ left: b.x, width: b.w, top: HUVUD_OVRE, height: HUVUD_NEDRE, lineHeight: `${HUVUD_NEDRE}px` }}
                >
                  {b.w >= 16 ? b.text : ""}
                </div>
              ))}
            </div>
          </div>

          {/* ---------- I dag ---------- */}
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-[4]"
            style={{ left: namnBredd + modell.idagX + modell.px / 2 - 1 }}
            aria-hidden="true"
          >
            <div
              className="absolute bottom-0 w-0.5 rounded-full"
              style={{
                top: HUVUD_OVRE + HUVUD_NEDRE,
                background: "var(--orange)",
                boxShadow: "0 0 0 2px color-mix(in srgb, var(--orange) 22%, transparent), 0 0 14px color-mix(in srgb, var(--orange) 55%, transparent)",
              }}
            />
          </div>
          <div
            className="pointer-events-none absolute z-[4] -translate-x-1/2"
            style={{ left: namnBredd + modell.idagX + modell.px / 2, top: HUVUD_OVRE + HUVUD_NEDRE - 11 }}
          >
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warn-bg px-2 py-0.5 text-[10.5px] font-bold text-warn-ink shadow-sm ring-1 ring-inset ring-orange">
              <span className="h-1.5 w-1.5 rounded-full bg-orange" aria-hidden="true" />I dag · {kortDatum(nu)}
            </span>
          </div>

          {/* ---------- Rader ---------- */}
          <div className="relative">
            {synliga.map((r) => {
              if (r.typ === "spar") {
                const oppet = !hopfallda.has(r.rad.id);
                const sena = r.poster.filter((p) => lageFor(p) === "forsenad").length;
                const [a, b] = r.poster.length
                  ? [r.poster.map((p) => spann(p)[0]).sort()[0], r.poster.map((p) => spann(p)[1]).sort().pop()]
                  : [null, null];
                return (
                  <div
                    key={`s-${r.rad.id}`}
                    className="flex border-0 border-t border-solid border-hairline-stark first:border-t-0"
                    style={{ height: SPAR_H, background: "color-mix(in srgb, var(--sunken) 85%, transparent)" }}
                  >
                    <div
                      className="sticky left-0 z-[5] flex shrink-0 items-center border-0 border-r border-solid border-hairline bg-sunken"
                      style={{ width: namnBredd }}
                    >
                      <button
                        type="button"
                        className="flex h-full w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 text-left font-body"
                        aria-expanded={oppet}
                        title={r.rad.namn}
                        onClick={() => vaxla(r.rad.id)}
                      >
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className={`shrink-0 text-ink-soft transition-transform ${oppet ? "" : "-rotate-90"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-ink">{r.rad.namn}</span>
                          <span className="block truncate text-[11px] text-ink-soft">
                            {r.poster.length} {r.poster.length === 1 ? "post" : "poster"}
                            {sena ? ` · ${sena} försenade` : ""}
                          </span>
                        </span>
                      </button>
                    </div>
                    <div className="relative" style={{ width: tidsbredd }}>
                      {a ? (
                        <div
                          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                          style={{
                            left: modell.xIso(a),
                            width: Math.max(modell.xIso(b) + modell.px - modell.xIso(a), 6),
                            background: "color-mix(in srgb, var(--ink-faint) 45%, transparent)",
                          }}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  </div>
                );
              }

              if (r.typ === "grupp") {
                return (
                  <div key={`g-${r.rad.id}-${r.grupp.id}`} className="flex" style={{ height: GRUPP_H }}>
                    <div
                      className="sticky left-0 z-[5] flex shrink-0 items-end gap-1 whitespace-nowrap border-0 border-r border-solid border-hairline bg-surface px-3 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-ink-soft"
                      style={{ width: namnBredd }}
                      title={r.grupp.namn}
                    >
                      <span className="min-w-0 truncate">{r.grupp.namn}</span>
                      <span className="shrink-0 font-semibold text-ink-faint">{r.antal}</span>
                    </div>
                    <div style={{ width: tidsbredd }} />
                  </div>
                );
              }

              if (r.typ === "tom") {
                return (
                  <div key={`t-${r.rad.id}`} className="flex" style={{ height: RAD_H }}>
                    <div
                      className="sticky left-0 z-[5] flex shrink-0 items-center border-0 border-r border-solid border-hairline bg-surface px-3 text-[12px] text-ink-faint"
                      style={{ width: namnBredd }}
                    >
                      Inga daterade poster
                    </div>
                    <div style={{ width: tidsbredd }} />
                  </div>
                );
              }

              const p = r.post;
              const lage = lageFor(p);
              const stil = LAGE[lage];
              const Ikon = stil.ikon;
              const TypIkon = TYPIKON[p.typ] || CalendarDays;
              const [a, b] = spann(p);
              const arSpann = a !== b;
              const vanster = modell.xIso(a);
              const bredd = arSpann ? Math.max(modell.xIso(b) + modell.px - vanster, 10) : 0;
              const arVald = vald?.postId === p.id && vald?.radId === r.rad.id;
              const dagar = dagarTill(b);
              const etikettText = `${p.titel}, ${a}${arSpann ? ` till ${b}` : ""}, ${stil.text}, ${r.rad.namn}. ${
                dagar === null ? "" : dagar < 0 ? `${Math.abs(dagar)} dagar sedan` : `${dagar} dagar kvar`
              }`;
              const rymsInne = arSpann && bredd - 30 >= p.titel.length * 6.4;
              const handelser = {
                onClick: () => valjPost(p, r.rad),
                onPointerEnter: (e) => visaTips(e, p, r.rad),
                onPointerLeave: doljTips,
                onFocus: (e) => visaTips(e, p, r.rad),
                onBlur: doljTips,
                "aria-pressed": arVald,
                "aria-label": etikettText,
                "aria-describedby": tips?.postId === p.id && tips?.radId === r.rad.id ? tipsId : undefined,
              };

              return (
                <div
                  key={`p-${r.rad.id}-${p.id}`}
                  className="group/rad flex hover:[background:color-mix(in_srgb,var(--sunken)_60%,transparent)]"
                  style={{ height: RAD_H }}
                >
                  <div
                    className="sticky left-0 z-[5] flex shrink-0 items-center gap-2 border-0 border-r border-solid border-hairline bg-surface px-3 group-hover/rad:bg-sunken"
                    style={{ width: namnBredd }}
                    title={p.titel}
                  >
                    <TypIkon size={14} aria-hidden="true" className="shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{p.titel}</span>
                  </div>

                  <div className="relative" style={{ width: tidsbredd }}>
                    {arSpann ? (
                      <button
                        type="button"
                        {...handelser}
                        className={`absolute z-[2] flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg border border-l-[3px] border-solid px-1.5 text-left font-body shadow-sm transition duration-150 hover:z-[3] hover:-translate-y-px hover:shadow-md focus-visible:z-[3] ${
                          arVald ? "ring-2 ring-one-bla ring-offset-1 ring-offset-surface" : ""
                        }`}
                        style={{
                          left: vanster,
                          width: bredd,
                          top: (RAD_H - STAPEL_H) / 2,
                          height: STAPEL_H,
                          background: lage === "planerad" ? "var(--sunken)" : tonad(stil.farg),
                          borderColor: stil.farg,
                          color: stil.ink,
                        }}
                      >
                        {lage === "pagaende" && a < nu ? (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-0 left-0 top-0"
                            style={{
                              width: Math.min(modell.xIso(nu) - vanster + modell.px / 2, bredd),
                              background: "color-mix(in srgb, var(--one-bla) 16%, transparent)",
                            }}
                          />
                        ) : null}
                        <Ikon size={12} strokeWidth={2.4} aria-hidden="true" className="relative shrink-0" />
                        {rymsInne ? (
                          <span className="relative truncate text-[11.5px] font-semibold">{p.titel}</span>
                        ) : null}
                      </button>
                    ) : (
                      <button
                        type="button"
                        {...handelser}
                        className={`absolute z-[2] flex h-6 w-6 -translate-x-1/2 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 transition duration-150 hover:z-[3] hover:-translate-y-px focus-visible:z-[3] ${
                          arVald ? "ring-2 ring-one-bla" : ""
                        }`}
                        style={{ left: vanster + modell.px / 2, top: (RAD_H - 24) / 2 }}
                      >
                        <span
                          aria-hidden="true"
                          className="block h-3 w-3 rotate-45 rounded-[2px] border-2 border-solid shadow-sm"
                          style={{
                            borderColor: stil.farg,
                            background: lage === "planerad" ? "var(--surface)" : stil.farg,
                          }}
                        />
                      </button>
                    )}

                    {!rymsInne ? (
                      <span
                        className="pointer-events-none absolute flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-ink-soft"
                        style={{
                          left: arSpann ? vanster + bredd + 8 : vanster + modell.px / 2 + 14,
                          top: 0,
                          height: RAD_H,
                        }}
                        aria-hidden="true"
                      >
                        <b className="font-semibold text-ink">{p.titel}</b>
                        <span className="tabular-nums">{arSpann ? `${kortDatum(a)} – ${kortDatum(b)}` : kortDatum(a)}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- Teckenförklaring ---------- */}
      <ul aria-label="Teckenförklaring" className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1.5 p-0 text-[12px] text-ink-soft">
        {Object.entries(LAGE).map(([k, v]) => {
          const Ikon = v.ikon;
          return (
            <li key={k} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-flex h-3.5 w-6 items-center justify-center rounded border border-l-[3px] border-solid"
                style={{ borderColor: v.farg, background: k === "planerad" ? "var(--sunken)" : tonad(v.farg), color: v.ink }}
              >
                <Ikon size={9} strokeWidth={2.6} />
              </span>
              {v.text}
            </li>
          );
        })}
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="block h-2.5 w-2.5 rotate-45 rounded-[2px] border-2 border-solid border-one-bla" />
          Händelse på ett datum
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="block h-3 w-0.5 rounded-full bg-orange" />I dag
        </li>
      </ul>

      {/* ---------- Verktygstips ---------- */}
      {tipsPost ? (
        <Verktygstips
          id={tipsId}
          post={tipsPost.post}
          rad={tipsPost.rad}
          x={tips.x}
          y={tips.y}
          under={tips.under}
        />
      ) : null}

      {/* ---------- Detaljer och redigering ---------- */}
      {valt ? (
        <Detaljpanel post={valt.post} rad={valt.rad} onStang={() => setVald(null)}>
          {redigera ? redigera(valt.post, valt.rad) : null}
        </Detaljpanel>
      ) : null}
    </div>
  );
}

function Verktygstips({ id, post, rad, x, y, under }) {
  const lage = lageFor(post);
  const stil = LAGE[lage];
  const Ikon = stil.ikon;
  const [a, b] = spann(post);
  const langd = Math.round((utc(b) - utc(a)) / MS_DAG) + 1;
  const ansvarig = post.ansvarig || post.leverantor;

  return (
    <div
      id={id}
      role="tooltip"
      className={`pointer-events-none absolute z-30 w-72 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg border border-solid border-hairline bg-surface px-3 py-2.5 text-[12px] text-ink shadow-md ${
        under ? "" : "-translate-y-full"
      }`}
      style={{ left: x, top: y }}
    >
      <b className="block text-[13px] leading-snug text-ink">{post.titel}</b>
      <span className="mt-1 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: stil.ink }}>
          <Ikon size={13} strokeWidth={2.4} aria-hidden="true" />
          {stil.text}
        </span>
        {post.typ ? <span className="text-ink-soft">· {post.typ}</span> : null}
      </span>
      <dl className="m-0 mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
        <dt className="text-ink-soft">{a === b ? "Datum" : "Period"}</dt>
        <dd className="m-0 tabular-nums">
          {a === b ? langtDatum(a) : `${langtDatum(a)} – ${langtDatum(b)} · ${langd} d`}
        </dd>
        <dt className="text-ink-soft">Ansvarig</dt>
        <dd className="m-0">{ansvarig || "—"}</dd>
        <dt className="text-ink-soft">Projekt</dt>
        <dd className="m-0 truncate">{rad.namn}</dd>
      </dl>
      <span className="mt-1.5 block text-[11px] text-ink-faint">Klicka för att se och ändra</span>
    </div>
  );
}

function Detaljpanel({ post, rad, onStang, children }) {
  const lage = lageFor(post);
  const stil = LAGE[lage];
  const Ikon = stil.ikon;
  const [a, b] = spann(post);
  const dagar = dagarTill(b);

  const falt = [
    ["Projekt", rad.namn],
    ["Typ", post.typ || "Milstolpe"],
    [a === b ? "Datum" : "Start", a],
    a === b ? null : ["Slut", b],
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
      className="flex flex-col gap-4 rounded-lg border border-solid border-one-bla bg-surface p-4 shadow-md md:p-5"
      role="region"
      aria-label={`Detaljer för ${post.titel}`}
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="m-0 font-head text-[16px] font-bold text-ink">{post.titel}</h4>
          <p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">
            {rad.namn}
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: stil.ink }}>
              <Ikon size={13} strokeWidth={2.4} aria-hidden="true" />
              {stil.text}
            </span>
          </p>
        </div>
        <button type="button" className="btn sec mini" onClick={onStang}>
          Stäng
        </button>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
        {falt.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-faint">{k}</dt>
            <dd className="m-0 mt-0.5 break-words text-[13px] text-ink">{v || "—"}</dd>
          </div>
        ))}
      </dl>

      {children}

      {post.anteckning ? (
        <p className="m-0 border-0 border-t border-solid border-hairline pt-3 text-[13px] leading-relaxed text-ink-soft">
          {post.anteckning}
        </p>
      ) : null}
    </div>
  );
}
