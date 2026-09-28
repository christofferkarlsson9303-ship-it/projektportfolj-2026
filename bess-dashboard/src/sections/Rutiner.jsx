import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Callout, Card, CheckList, Meter, Overline, StatTile, StatusBadge } from "../components/ds/index.js";
import { RUTINER } from "../data/rutiner.js";
import { rutinAntal, rutinKlar, rutinNyckel } from "../lib/berakningar.js";

/* Projektledarens handbok på designsystemet.

   ONE Nordics rollbeskrivning och entreprenadjuridiska flödesscheman som egna
   kapitel, avbockade separat per projekt. Kapitlen är regelverket — själva
   arbetet registreras i de flikar kapitlen länkar till.

   Ett kapitel i taget är utfällt, som i originalet. Kapitelrubriken är en
   knapp med aria-expanded och aria-controls; mätaren visar hur långt
   projektet har kommit i kapitlet. */

function Kapitel({ r, pid, state, oppen, onVaxlaKapitel, onVaxlaPunkt, onGaTill }) {
  const { tot, klar } = rutinAntal(state, pid, r);
  const fardigt = tot > 0 && klar === tot;
  const panelId = `kapitel-${r.id.replace(/\W/g, "_")}`;

  return (
    <li
      data-roll="kapitel"
      data-punkter={tot}
      className="border-0 border-t border-solid border-hairline first:border-t-0"
    >
      <h4 className="m-0">
        <button
          type="button"
          className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-3 text-left font-body hover:bg-sunken"
          aria-expanded={oppen}
          aria-controls={panelId}
          onClick={() => onVaxlaKapitel(r.id)}
        >
          <span
            className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-bold ${
              fardigt ? "bg-ok-bg text-ok-ink" : "bg-one-djup text-white"
            }`}
          >
            {r.id}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold leading-snug text-ink">{r.titel}</span>
            {r.kalla ? <span className="mt-0.5 block text-xs text-ink-soft">{r.kalla}</span> : null}
          </span>
          {tot ? (
            <>
              <Meter value={klar} max={tot} size="sm" className="hidden w-20 shrink-0 sm:block" />
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-soft">
                {klar}/{tot}
                <span className="sr-only"> punkter avbockade</span>
              </span>
            </>
          ) : (
            <StatusBadge ton="neutral" label="Referens" />
          )}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-ink-faint transition-transform ${oppen ? "rotate-180" : ""}`}
          />
        </button>
      </h4>

      {oppen ? (
        <div id={panelId} className="flex flex-col gap-4 pb-5 sm:pl-11">
          {r.ingress ? <p className="m-0 text-[13px] leading-relaxed text-ink-soft">{r.ingress}</p> : null}

          {r.lank ? (
            <div>
              <button type="button" className="btn mini" onClick={() => onGaTill(r.lank[0])}>
                {r.lank[1]} →
              </button>
            </div>
          ) : null}

          {r.grupper.map((g, gi) => (
            <div key={g.namn || gi} className="flex flex-col gap-1.5">
              {g.namn ? <Overline as="h5">{g.namn}</Overline> : null}
              {g.info ? <p className="m-0 text-xs leading-snug text-ink-soft">{g.info}</p> : null}
              {g.text ? (
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-snug text-ink marker:text-one-bla">
                  {g.text.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : null}
              {g.punkter?.length ? (
                <CheckList
                  label={`${r.id} ${g.namn || "Punkter"}`}
                  items={g.punkter.map((pt) => {
                    const nyckel = rutinNyckel(r.id, gi, pt.n);
                    return { id: nyckel, label: pt.t, hint: pt.h, checked: rutinKlar(state, pid, nyckel) };
                  })}
                  onChange={onVaxlaPunkt}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function Rutiner() {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt: pid, visa } = useUi();
  const [oppet, setOppet] = useState(null);

  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return null;

  const antal = RUTINER.map((r) => rutinAntal(state, pid, r));
  const summa = antal.reduce((s, a) => ({ tot: s.tot + a.tot, klar: s.klar + a.klar }), { tot: 0, klar: 0 });
  const proc = summa.tot ? Math.round((summa.klar / summa.tot) * 100) : 0;
  const medPunkter = antal.filter((a) => a.tot > 0);
  const klaraKap = medPunkter.filter((a) => a.klar === a.tot).length;
  const paborjade = medPunkter.filter((a) => a.klar > 0 && a.klar < a.tot).length;

  const vaxlaPunkt = (nyckel, klar) => dispatch({ type: "VAXLA_RUTINPUNKT", pid, nyckel, klar });
  const projektNamn = (p.nr ? p.nr + " " : "") + p.namn;

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile
            label="Genomgånget"
            value={`${proc} %`}
            ton={proc >= 80 ? "" : proc >= 40 ? "warn" : "bad"}
            hint={`${summa.klar} av ${summa.tot} punkter i ${p.nr || p.namn}`}
          />
          <StatTile
            label="Färdiga kapitel"
            value={`${klaraKap}/${medPunkter.length}`}
            hint="kapitel med alla punkter avbockade"
          />
          <StatTile label="Påbörjade" value={paborjade} hint="kapitel där arbetet är igång" />
          <StatTile label="Kapitel totalt" value={RUTINER.length} hint="hela projektledarens handbok" />
        </div>

        <Card
          id="handbok-kapitel"
          title={`Projektledarens handbok — ${projektNamn}`}
          subtitle="ONE Nordics rollbeskrivning och entreprenadjuridiska flödesscheman som egna kapitel, avbockade separat för varje projekt. Det som sägs om entreprenaden gäller även DUS-avtal. Kapitel med egen arbetsflik har en genväg dit."
        >
          <Meter value={summa.klar} max={summa.tot} label={`${summa.klar} av ${summa.tot} punkter genomgångna`} />
          <ul aria-label="Kapitel i handboken" className="m-0 list-none p-0">
            {RUTINER.map((r) => (
              <Kapitel
                key={r.id}
                r={r}
                pid={pid}
                state={state}
                oppen={oppet === r.id}
                onVaxlaKapitel={(id) => setOppet(oppet === id ? null : id)}
                onVaxlaPunkt={vaxlaPunkt}
                onGaTill={visa}
              />
            ))}
          </ul>
        </Card>

        <Callout ton="info">
          <b>Så hänger det ihop:</b> kapitel 2.4 och 2.4.1 arbetas operativt i fliken <b>Störning</b>,
          ÄTA-dokumentationen i <b>Dagbok</b> och <b>ÄTA och hinder</b>, veckogenomgången i <b>Veckokoll</b>{" "}
          och avslutet i <b>Slutdokumentation</b>. Kapitlen här är regelverket och avbockningen — flikarna är
          där arbetet registreras.
        </Callout>
      </div>
    </>
  );
}
