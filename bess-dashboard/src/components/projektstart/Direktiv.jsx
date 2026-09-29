import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, Overline, StatusBadge } from "../ds/index.js";
import { DatumFalt, Falt } from "../ui/Falt.jsx";
import { EpcKopplingar } from "../epc/Kopplingar.jsx";
import { DirektivDokument } from "./DirektivDokument.jsx";
import { DIREKTIV_FALT, PROJEKTSTART_EPC, TRIANGEL } from "../../data/projektstart.js";
import { DIREKTIV_NYCKLAR, tolkaProcent } from "../../lib/projektstart.js";
import { idag } from "../../lib/datum.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";

/* Projektdirektivet — ONE P:s styrdokument mellan intern beställare och
   projektledare. Fälten skriver vid blur (Falt). Varje ändring i ett
   direktivfält eller i triangeln sätter `andrad`, och en signatur äldre än
   den räknas som inaktuell: det som signerades är inte längre det som står.

   Signera-knappen är låst tills alla obligatoriska fält är ifyllda och
   triangeln summerar till 100 %. */

const SIGN_TON = { giltig: "ok", inaktuell: "warn", saknas: "neutral" };

function Signatur({ roll, prefix, s, rad, komplett, satt, forslag }) {
  const etikett =
    s.status === "giltig" ? `Signerat ${s.datum}` : s.status === "inaktuell" ? "Signera om" : "Ej signerat";
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-solid border-hairline bg-sunken p-3">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-[13px] text-ink">{roll}</b>
        <StatusBadge ton={SIGN_TON[s.status]} label={etikett} />
      </span>
      <div className="frow c2">
        <div className="f mb-0">
          <label htmlFor={`${prefix}-namn-${rad.id}`}>Namn</label>
          <Falt
            id={`${prefix}-namn-${rad.id}`}
            varde={rad[`${prefix}Namn`]}
            etikett={`${roll} — namn`}
            onCommit={(v) => satt(`${prefix}Namn`, v)}
          />
        </div>
        <div className="f mb-0">
          <label htmlFor={`${prefix}-dat-${rad.id}`}>Datum</label>
          <DatumFalt
            id={`${prefix}-dat-${rad.id}`}
            varde={rad[`${prefix}Datum`]}
            etikett={`${roll} — signaturdatum`}
            onCommit={(v) => {
              // Handskrivet datum — ingen tidsstämpel, jämförs på dag.
              satt(`${prefix}Datum`, v);
              satt(`${prefix}Tid`, "");
            }}
          />
        </div>
      </div>
      {s.status !== "giltig" ? (
        <div>
          <button
            type="button"
            className="btn mini"
            disabled={!komplett}
            onClick={() => {
              if (!rad[`${prefix}Namn`] && forslag) satt(`${prefix}Namn`, forslag);
              satt(`${prefix}Datum`, idag());
              satt(`${prefix}Tid`, new Date().toISOString());
            }}
          >
            Signera idag
            <span className="sr-only"> som {roll.toLowerCase()}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function DirektivKort({ projekt, lage }) {
  const { state, uppd } = usePortfolj();
  const { skrivUt } = useUi();
  const { rad, triangel, ib, pl } = lage;

  const harRad = (state.projektstart || []).some((r) => r.id === rad.id);
  const satt = (falt, varde) => {
    if (!harRad) return;
    uppd("projektstart", rad.id, falt, varde);
    if (DIREKTIV_NYCKLAR.has(falt)) {
      uppd("projektstart", rad.id, "andrad", idag());
      uppd("projektstart", rad.id, "andradTid", new Date().toISOString());
    }
  };

  const badge = lage.signerat ? (
    <StatusBadge ton="ok" label="Signerat" />
  ) : ib.status === "inaktuell" || pl.status === "inaktuell" ? (
    <StatusBadge ton="warn" label="Ändrat efter signering" />
  ) : (
    <StatusBadge ton="bad" label="Ej signerat" />
  );

  return (
    <Card
      id="ps-direktiv"
      title="Projektdirektiv"
      subtitle="Omfattning och intern styrning. Signeras av intern beställare och projektledare innan startmötet (hållpunkt)."
      badge={badge}
      action={
        <button
          type="button"
          className="btn sec mini"
          onClick={() => skrivUt(<DirektivDokument projekt={projekt} lage={lage} />)}
        >
          Direktiv (A4)
        </button>
      }
    >
      {!harRad ? <Callout ton="warn">Projektets rad saknas. Ladda om sidan så skapas den.</Callout> : null}

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
        {DIREKTIV_FALT.map((f) => (
          <div key={f.id} className="f">
            <label htmlFor={`ps-${f.id}-${rad.id}`}>
              {f.rubrik}
              {f.krav ? <span className="text-rod"> *</span> : null}
            </label>
            <Falt
              id={`ps-${f.id}-${rad.id}`}
              varde={rad[f.id]}
              etikett={f.rubrik}
              flerrad
              placeholder={f.hjalp}
              onCommit={(v) => satt(f.id, v)}
            />
          </div>
        ))}
      </div>
      <p className="m-0 text-xs text-ink-soft">
        <span className="text-rod">*</span> krävs innan direktivet kan signeras.
      </p>

      <div className="flex flex-col gap-2">
        <Overline>Projekttriangeln — prioritering i procent</Overline>
        <div className="frow c3">
          {TRIANGEL.map((t) => (
            <div key={t.id} className="f mb-0">
              <label htmlFor={`ps-${t.id}-${rad.id}`}>{t.namn} (%)</label>
              <Falt
                id={`ps-${t.id}-${rad.id}`}
                varde={rad[t.id] ?? ""}
                etikett={`${t.namn} i procent`}
                inputMode="numeric"
                onCommit={(v) => satt(t.id, tolkaProcent(v))}
              />
            </div>
          ))}
        </div>
        <p className="m-0 text-[13px] text-ink" aria-live="polite">
          Summa <b className="tabular-nums">{triangel.summa} %</b>
          {triangel.ok
            ? triangel.hogst
              ? ` — ${triangel.hogst.namn.toLowerCase()} är högst prioriterad.`
              : " — ingen parameter är högst prioriterad. Välj en."
            : triangel.komplett
              ? " — ska vara 100 %."
              : " — fyll i alla tre."}
        </p>
      </div>

      {lage.saknas.length ? (
        <Callout>
          <b>Kvar innan signering:</b> {lage.saknas.map((f) => f.rubrik).join(", ")}
          {triangel.ok ? "" : ", projekttriangeln"}.
        </Callout>
      ) : !triangel.ok ? (
        <Callout>
          <b>Kvar innan signering:</b> projekttriangeln ska summera till 100 %.
        </Callout>
      ) : null}

      {ib.status === "inaktuell" || pl.status === "inaktuell" ? (
        <Callout ton="warn">
          <b>Direktivet ändrades {rad.andrad}, efter signeringen.</b> Stäm av ändringen med intern beställare och
          signera om.
        </Callout>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Signatur roll="Intern beställare" prefix="ib" s={ib} rad={rad} komplett={lage.komplett} satt={satt} />
        <Signatur
          roll="Projektledare"
          prefix="pl"
          s={pl}
          rad={rad}
          komplett={lage.komplett}
          satt={satt}
          forslag={hamtaNamn() || ""}
        />
      </div>

      <EpcKopplingar
        pid={projekt.id}
        rader={[{ punktId: PROJEKTSTART_EPC.direktiv, text: "Projektdirektivet signerat", redo: lage.signerat }]}
      />
    </Card>
  );
}
