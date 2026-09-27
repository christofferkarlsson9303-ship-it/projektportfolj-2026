import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Pill, SelStatus } from "../components/ui/Primitiver.jsx";
import { DatumFalt } from "../components/ui/Falt.jsx";
import { Callout, Card, Meter, StatusBadge } from "../components/ds/index.js";
import { MILSTOLPE_MODELL } from "../data/konstanter.js";
import { fmtSEK } from "../lib/format.js";
import { betalRad, ekonomi, mUnderlagKlart, mstatusRad, nastaMilstolpe, projekt } from "../lib/berakningar.js";

/* Betalningsmilstolparna M1–M7 på designsystemet: ett översiktskort med
   fakturerat, nästa lyft och kvar, och en ruta per milstolpe i ordning.
   Därunder ett kort per milstolpe med underlagen att bocka av och
   faktureringen. Nästa lyft ramas in i ONE Blå — det är den som ska drivas. */

/** Läget för en milstolpe i remsan — text bär läget, kanten förstärker. */
const LAGE = {
  klar: { text: "Fakturerad", kant: "border-t-turkos" },
  nu: { text: "Nästa lyft", kant: "border-t-one-bla" },
  redo: { text: "Underlag klart", kant: "border-t-duvbla" },
  vantar: { text: "Väntar", kant: "border-t-hairline-stark" },
};

const Overrad = ({ children }) => (
  <h4 className="m-0 font-body text-[11px] font-bold uppercase tracking-wider text-ink-soft">{children}</h4>
);

function Remsa({ state, pid, nastaKod }) {
  return (
    <ol aria-label="Milstolparna i ordning" className="m-0 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-7">
      {MILSTOLPE_MODELL.map((m) => {
        const b = betalRad(state, pid, m.kod);
        const u = mUnderlagKlart(state, pid, m);
        const lage = b?.status === "fakturerad" ? "klar" : m.kod === nastaKod ? "nu" : u.allt ? "redo" : "vantar";
        return (
          <li
            key={m.kod}
            title={m.namn}
            className={`flex min-w-0 flex-col items-center gap-0.5 rounded-lg border border-t-[3px] border-solid border-hairline px-1 py-2 text-center ${
              LAGE[lage].kant
            } ${lage === "nu" ? "bg-info-bg" : "bg-surface"}`}
          >
            <b className="font-head text-[15px] leading-tight text-ink">{m.kod}</b>
            <span className="text-[11px] tabular-nums text-ink-soft">{m.andel} %</span>
            <span className="text-[10.5px] font-semibold leading-tight text-ink-soft">
              <span className="sr-only">{m.namn} — </span>
              {LAGE[lage].text}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Oversikt({ state, pid, p, nastaKod }) {
  const e = ekonomi(state, pid);
  const nasta = MILSTOLPE_MODELL.find((m) => m.kod === nastaKod);
  const tal = [
    { etikett: "Fakturerat", varde: `${e.faktProc} %`, detalj: e.faktSEK !== null ? fmtSEK(e.faktSEK) : "kontraktsvärde saknas" },
    {
      etikett: "Nästa lyft",
      varde: nasta ? nasta.kod : "—",
      detalj: nasta ? `${nasta.namn} · ${nasta.andel} %` : "alla milstolpar fakturerade",
    },
    { etikett: "Kvar att fakturera", varde: `${100 - e.faktProc} %`, detalj: e.kvarSEK !== null ? fmtSEK(e.kvarSEK) : "—" },
  ];
  return (
    <Card
      id="ms-rubrik"
      title={`Betalningsmilstolpar M1–M7 — ${(p.nr ? p.nr + " " : "") + p.namn}`}
      subtitle="Kontraktets betalningsplan. Utlösande krav och andelar kommer ur projektmodellen; underlagen bockas av här och styr när lyftet kan aviseras."
    >
      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tal.map((t) => (
          <div key={t.etikett} className="flex min-w-0 flex-col gap-1">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{t.etikett}</dt>
            <dd className="m-0 text-2xl font-bold leading-none tabular-nums text-ink">{t.varde}</dd>
            <dd className="m-0 text-xs text-ink-soft">{t.detalj}</dd>
          </div>
        ))}
      </dl>
      <Meter value={e.faktProc} label={`Fakturerat av kontraktet för ${p.namn}`} />
      <Remsa state={state} pid={pid} nastaKod={nastaKod} />
    </Card>
  );
}

function Milstolpe({ m, state, pid, kv, ar, dispatch }) {
  const b = betalRad(state, pid, m.kod);
  const u = mUnderlagKlart(state, pid, m);
  const r = mstatusRad(state, pid, m.kod);
  const belopp = kv ? Math.round((kv * m.andel) / 100) : null;

  return (
    <Card
      id={`ms-${pid}-${m.kod}`}
      title={`${m.kod} · ${m.namn}`}
      subtitle={m.krav}
      className={ar ? "ring-2 ring-one-bla" : ""}
      badge={
        <>
          <span className="flex flex-col items-end leading-tight">
            <b className="font-body text-base tabular-nums text-ink">{m.andel} %</b>
            <span className="text-xs tabular-nums text-ink-soft">{belopp !== null ? fmtSEK(belopp) : "belopp saknas"}</span>
          </span>
          {ar ? <StatusBadge ton="info" label="Nästa lyft" /> : null}
          <Pill status={b ? b.status : "kvar"} />
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <Overrad>Underlag</Overrad>
            <span className="text-xs font-semibold tabular-nums text-ink-soft">
              {u.klara}/{u.av}
            </span>
          </div>
          <Meter value={u.klara} max={u.av} size="sm" label={`Underlag klart för ${m.kod}`} />
          <ul className="m-0 list-none p-0">
            {m.underlag.map(([n, text]) => {
              const id = `mu_${pid}_${m.kod}_${n}`;
              const klar = !!(r.underlag || {})[n];
              return (
                <li key={n} className="flex items-start gap-3 border-0 border-t border-solid border-hairline py-2 first:border-t-0">
                  <input
                    type="checkbox"
                    id={id}
                    checked={klar}
                    className="m-0 mt-0.5 h-[18px] w-[18px] shrink-0 accent-one-bla"
                    onChange={(e) =>
                      dispatch({ type: "UPPD_MUNDERLAG", pid, kod: m.kod, n, varde: e.target.checked })
                    }
                  />
                  <label htmlFor={id} className={`flex-1 cursor-pointer text-[13px] leading-snug ${klar ? "text-ink-faint" : "text-ink"}`}>
                    {text}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Overrad>Fakturering</Overrad>
          <div className="f mb-0">
            <label htmlFor={`av_${pid}_${m.kod}`}>Förhandsavisering skickad</label>
            <DatumFalt
              id={`av_${pid}_${m.kod}`}
              varde={r.avisering || ""}
              etikett={`Förhandsavisering för ${m.kod}`}
              onCommit={(v) => dispatch({ type: "UPPD_MSTATUS", pid, kod: m.kod, falt: "avisering", varde: v })}
            />
          </div>
          <div className="f mb-0">
            <label htmlFor={`fa_${pid}_${m.kod}`}>Faktura i IFS</label>
            <DatumFalt
              id={`fa_${pid}_${m.kod}`}
              varde={r.faktura || ""}
              etikett={`Fakturadatum för ${m.kod}`}
              onCommit={(v) => dispatch({ type: "UPPD_MSTATUS", pid, kod: m.kod, falt: "faktura", varde: v })}
            />
          </div>
          <div className="f mb-0">
            <label htmlFor={`bs_${pid}_${m.kod}`}>
              Betalstatus <StatusBadge label="Endast administratör" className="ml-1 normal-case tracking-normal" />
            </label>
            {b ? (
              <SelStatus
                id={`bs_${pid}_${m.kod}`}
                alternativ={["fakturerad", "pagaende", "kvar"]}
                varde={b.status}
                etikett={`Betalstatus för ${m.kod}`}
                onChange={(v) => dispatch({ type: "UPPD_BETALPLAN", id: b.id, falt: "status", varde: v })}
              />
            ) : (
              <p className="m-0 text-xs text-ink-soft">Ingen betalplansrad för {m.kod} — lägg till den i Ekonomi.</p>
            )}
          </div>

          {!u.allt && r.avisering ? (
            <Callout ton="warn">
              <b>Aviserat med ofullständigt underlag.</b> {u.av - u.klara} punkt
              {u.av - u.klara > 1 ? "er" : ""} återstår för {m.kod}.
            </Callout>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function Milstolpar() {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt: pid } = useUi();

  const p = projekt(state, pid);
  if (!p) return null;

  const kv = ekonomi(state, pid).kv;
  const nastaKod = (nastaMilstolpe(state, pid) || {}).kod;

  return (
    <>
      <Projektvaljare />
      <div className="flex flex-col gap-4 lg:gap-6">
        <Oversikt state={state} pid={pid} p={p} nastaKod={nastaKod} />
        {MILSTOLPE_MODELL.map((m) => (
          <Milstolpe key={m.kod} m={m} state={state} pid={pid} kv={kv} ar={m.kod === nastaKod} dispatch={dispatch} />
        ))}
        <Callout>
          <b>Rutin.</b> Skicka förhandsavisering på Excel-mallen via e-post för beställarens godkännande först —
          därefter formell faktura i IFS. Kontraktsvärde och betalstatus kan bara ändras av administratören;
          underlagsbockarna är öppna för alla.
        </Callout>
      </div>
    </>
  );
}
