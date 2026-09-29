import { usePortfolj } from "../../state/hooks.js";
import { Callout, Card, Meter, Overline, StatusBadge } from "../ds/index.js";
import { DatumFalt, Falt } from "../ui/Falt.jsx";
import { EpcKopplingar } from "../epc/Kopplingar.jsx";
import { Markeringar } from "../epc/Delar.jsx";
import { PROJEKTSTART_EPC, UPPSTART_OMRADEN } from "../../data/projektstart.js";
import { idag } from "../../lib/datum.js";

/* Uppstartsavstämningen — PL går igenom projektet med intern beställare
   innan teamet kallas till startmöte. Varje fråga bockas och kan få en
   anteckning; svaren ligger i ett nästlat objekt på raden och skrivs som
   helhet, som skyddsrondens checklista.

   Klartecknet är intern beställares besked och är hållpunkt 1.23. Det kan
   ges först när alla frågor är avbockade och mötesdatum satt. */

export function UppstartKort({ projekt, lage, direktivSignerat }) {
  const { state, uppd } = usePortfolj();
  const { rad, fragor } = lage;
  const harRad = (state.projektstart || []).some((r) => r.id === rad.id);
  const satt = (falt, varde) => harRad && uppd("projektstart", rad.id, falt, varde);

  const svar = rad.uppstart || {};
  const sattSvar = (id, falt, varde) => satt("uppstart", { ...svar, [id]: { ...(svar[id] || {}), [falt]: varde } });
  const perId = new Map(fragor.map((f) => [f.id, f]));
  const kanGodkanna = lage.alla && lage.hallen;

  return (
    <Card
      id="ps-uppstart"
      title="Uppstartsavstämning"
      subtitle="PL och intern beställare går igenom förberedelserna. Efter klartecken kallas teamet till startmöte (hållpunkt)."
      badge={
        lage.godkand ? (
          <StatusBadge ton="ok" label={`Klartecken ${rad.uppstartOk}`} />
        ) : (
          <StatusBadge ton="bad" label="Inget klartecken" />
        )
      }
    >
      <div className="frow c2">
        <div className="f mb-0">
          <label htmlFor={`us-dat-${rad.id}`}>Avstämningen hölls</label>
          <DatumFalt
            id={`us-dat-${rad.id}`}
            varde={rad.uppstartDatum}
            etikett="Datum för uppstartsavstämningen"
            onCommit={(v) => satt("uppstartDatum", v)}
          />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <span className="flex items-baseline justify-between text-[13px] text-ink">
            <span>Genomgångna frågor</span>
            <b className="tabular-nums">
              {lage.klara}/{lage.totalt}
            </b>
          </span>
          <Meter value={lage.klara} max={lage.totalt} label="Genomgångna frågor i uppstartsavstämningen" />
        </div>
      </div>

      {!direktivSignerat ? (
        <Callout>
          Avstämningen jämför förberedelserna med kravställningen i projektdirektivet — signera direktivet först.
        </Callout>
      ) : null}

      {UPPSTART_OMRADEN.map((o) => (
        <div key={o.namn} className="flex flex-col gap-1">
          <Overline>{o.namn}</Overline>
          <ul aria-label={o.namn} className="m-0 list-none p-0">
            {o.fragor.map((q) => {
              const f = perId.get(q.id);
              const cb = `us-${rad.id}-${q.id}`;
              return (
                <li
                  key={q.id}
                  className="flex flex-col gap-2 border-0 border-t border-solid border-hairline py-2 first:border-t-0"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={cb}
                      checked={f.klar}
                      className="m-0 mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-one-bla"
                      onChange={(e) => sattSvar(q.id, "klar", e.target.checked)}
                    />
                    <label htmlFor={cb} className="flex-1 cursor-pointer text-[13px] leading-snug text-ink">
                      {q.text} <Markeringar badges={q.badges} />
                    </label>
                  </div>
                  <div className="pl-[30px]">
                    <Falt
                      varde={f.not}
                      etikett={`Anteckning: ${q.text}`}
                      placeholder="Anteckning (valfritt)"
                      onCommit={(v) => sattSvar(q.id, "not", v)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="flex flex-col gap-2 rounded-lg border border-solid border-hairline bg-sunken p-3">
        <b className="text-[13px] text-ink">Klartecken till startmöte — intern beställare</b>
        <div className="frow c2">
          <div className="f mb-0">
            <label htmlFor={`us-ok-${rad.id}`}>Klartecken givet</label>
            <DatumFalt
              id={`us-ok-${rad.id}`}
              varde={rad.uppstartOk}
              etikett="Datum för klartecken till startmöte"
              onCommit={(v) => satt("uppstartOk", v)}
            />
          </div>
          <div className="flex items-end">
            {!lage.godkand ? (
              <button
                type="button"
                className="btn mini"
                disabled={!kanGodkanna}
                onClick={() => satt("uppstartOk", idag())}
              >
                Klartecken idag
              </button>
            ) : null}
          </div>
        </div>
        {!lage.godkand && !kanGodkanna ? (
          <p className="m-0 text-xs text-ink-soft">
            Kräver att alla frågor är genomgångna och att mötesdatum är satt.
          </p>
        ) : null}
      </div>

      <EpcKopplingar
        pid={projekt.id}
        rader={[{ punktId: PROJEKTSTART_EPC.uppstart, text: "Uppstartsavstämning med klartecken", redo: lage.redo }]}
      />
    </Card>
  );
}
