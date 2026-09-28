import { useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Callout, Card, Meter, StatTile, StatusBadge } from "../components/ds/index.js";
import { DatumFalt, Falt } from "../components/ui/Falt.jsx";
import { Overlamningsindex } from "../components/ui/Overlamningsindex.jsx";
import { Slideover } from "../components/ui/Slideover.jsx";
import { DOKSTATUS, SLUTDOK_MALL } from "../data/konstanter.js";
import {
  dagarTillM6,
  slutdokArLast,
  slutdokIndex,
  slutdokKritisktKlart,
} from "../lib/berakningar.js";
import { fmtProcent } from "../lib/format.js";
import { registerStatus } from "../lib/status.js";

/* Slutdokumentation — grinden mot M6 och M7.

   Kategori 1–4 måste vara godkända innan slutbesiktning kan begäras. Det är
   inte en rekommendation: as-built enligt Appendix 03.7 är krav för
   slutbetalning, och flaggmotorn larmar när mindre än fjorton dagar återstår
   till färdigställandet och indexet ligger under 80 %.

   Raderna kommer ur SLUTDOK_MALL och sås i efterInlasning, inte här — en vy
   ska inte skriva data bara för att någon navigerar till den.

   Varje handling är en rad med bock och fyra statusknappar, så att en hel
   kategori går att beta av utan att öppna något. Ansvarig, datum, referens
   och kommentar ligger i en Slideover — de fylls i en gång, statusen ändras
   många gånger. Statusbyten går via uppdStatus och hamnar i ändringsloggen.

   Sidan står på designsystemet: grindarna som StatTile, indexet med Meter
   och varje kategori som ett Card med räknare och M6-märke. */

const KRITISKA = SLUTDOK_MALL.slice(0, 4).map(([k]) => k);

/* Kortnamn på knapparna; DOKSTATUS bär de långa namnen i Slideovern. */
const KORTNAMN = { ejpaborjad: "Ej påbörjad", bestalld: "Beställd", mottagen: "Granskas", godkand: "Godkänd" };

/* Att bocka ur en godkänd handling betyder att godkännandet dras tillbaka —
   den ligger då för granskning igen, inte på ruta ett. */
const UTBOCKAD = "mottagen";

const FILTER = [
  ["alla", "Alla"],
  ["kvar", "Kvar att göra"],
  ["kritiska", "Kategori 1–4"],
];

function Statusval({ d, onSatt }) {
  const nu = d.status || "ejpaborjad";
  return (
    <div className="slutdok-status" role="group" aria-label={`Status för ${d.krav}`}>
      {DOKSTATUS.map(([v]) => (
        <button
          key={v}
          type="button"
          className={v}
          aria-pressed={nu === v}
          onClick={() => onSatt(v)}
        >
          {KORTNAMN[v]}
        </button>
      ))}
    </div>
  );
}

function Handling({ d, last, onSatt, onOppna }) {
  const godkand = d.status === "godkand";
  const meta = [d.ansvarig, d.senast ? `senast ${d.senast}` : "", d.referens].filter(Boolean);

  return (
    <li className={`slutdok-rad ${d.status || "ejpaborjad"}`}>
      <button
        type="button"
        className="slutdok-bock"
        aria-pressed={godkand}
        aria-label={`Godkänd: ${d.krav}`}
        disabled={last}
        onClick={() => onSatt(godkand ? UTBOCKAD : "godkand")}
      >
        <span aria-hidden="true">{godkand ? "✓" : ""}</span>
      </button>

      <div className="slutdok-text">
        <div className="slutdok-krav">{d.krav}</div>
        {meta.length || d.kommentar ? (
          <div className="slutdok-meta">
            {meta.join(" · ")}
            {d.kommentar ? <span className="slutdok-kommenterad">Kommenterad</span> : null}
          </div>
        ) : null}
      </div>

      <div className="slutdok-atgard">
        {last ? (
          <span className="slutdok-last">
            <StatusBadge {...registerStatus("vantar")} />
            <span className="sr-only">Låst — slutbesiktningsprotokollet väntar på M6</span>
          </span>
        ) : (
          <Statusval d={d} onSatt={onSatt} />
        )}
        <button
          type="button"
          className="btn sec mini"
          aria-label={`Detaljer för ${d.krav}`}
          onClick={onOppna}
        >
          Detaljer
        </button>
      </div>
    </li>
  );
}

export function Slutdok() {
  const { state, uppd, uppdStatus } = usePortfolj();
  const { valtProjekt: pid, skrivUt } = useUi();
  const [filter, setFilter] = useState("alla");
  const [oppenId, setOppenId] = useState(null);

  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return null;

  const ix = slutdokIndex(state, pid);
  const d6 = dagarTillM6(state, pid);
  const gridOppen = slutdokKritisktKlart(state, pid);
  const larm = d6 !== null && d6 < 14 && ix.proc < 80;
  const kvar = ix.av - ix.godkanda;

  // Slås upp ur state varje render, så att panelen följer med när raden ändras.
  const oppen = ix.rader.find((d) => d.id === oppenId) || null;
  const oppenLast = oppen ? slutdokArLast(oppen, pid, state) : false;

  const sattStatus = (id, v) => uppdStatus("slutdok", id, "status", v);

  const synlig = (d) =>
    filter === "kvar" ? d.status !== "godkand" : filter === "kritiska" ? KRITISKA.includes(d.kategori) : true;
  const kategorier = SLUTDOK_MALL.map(([kat], i) => {
    const alla = ix.rader.filter((d) => d.kategori === kat);
    return { kat, nr: i + 1, alla, visade: alla.filter(synlig) };
  }).filter((k) => k.visade.length);

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile
            label="Överlämningsindex"
            value={fmtProcent(ix.proc)}
            hint={`${ix.godkanda} av ${ix.av} godkända`}
            ton={ix.proc < 80 ? "warn" : ""}
          />
          <StatTile label="Kvar att godkänna" value={kvar} hint="handlingar" />
          <StatTile
            label="M6-grind"
            value={gridOppen ? "Öppen" : "Spärrad"}
            hint={gridOppen ? "kritiska kategorier klara" : "kategori 1–4 ej kompletta"}
            ton={gridOppen ? "ok" : "bad"}
          />
          <StatTile
            label="Dagar till färdigställande"
            value={d6 === null ? "—" : d6}
            hint="enligt tidplanen"
            ton={d6 !== null && d6 < 14 ? "bad" : ""}
          />
        </div>

        {larm ? (
          <Callout ton="bad">
            <b>Kritiska överlämningshandlingar saknas inför slutbesiktning.</b> {d6} dagar kvar och index
            är {fmtProcent(ix.proc)}. As-built enligt Appendix 03.7 är krav för slutbetalning.
          </Callout>
        ) : null}

        <Card
          id="slutdok-rubrik"
          title={`Slutdokumentation — ${(p.nr ? p.nr + " " : "") + p.namn}`}
          subtitle="Bocka av handlingar när de är godkända. Kategori 1–4 måste vara klara innan M6 kan begäras."
          action={
            <button
              type="button"
              className="btn sec mini"
              onClick={() => skrivUt(<Overlamningsindex state={state} pid={pid} />)}
            >
              Överlämningsindex (A4)
            </button>
          }
        >
          <div className="flex flex-col gap-1.5">
            <Meter value={ix.proc} label={`${ix.godkanda} av ${ix.av} handlingar godkända`} />
            <div className="flex justify-between text-xs tabular-nums text-ink-soft">
              <span>{ix.godkanda} godkända</span>
              <span>{fmtProcent(ix.proc)}</span>
            </div>
          </div>

          {!gridOppen ? (
            <Callout ton="warn">
              M6 slutbesiktning kräver 100 % godkända obligatoriska handlingar (kategori 1–4).
            </Callout>
          ) : null}

          <div>
            <div className="seg" role="group" aria-label="Visa handlingar">
              {FILTER.map(([v, n]) => (
                <button
                  key={v}
                  type="button"
                  className={filter === v ? "on-neutral" : ""}
                  aria-pressed={filter === v}
                  onClick={() => setFilter(v)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {kategorier.length ? (
          kategorier.map(({ kat, nr, alla, visade }) => {
            const klara = alla.filter((d) => d.status === "godkand").length;
            const kritisk = nr <= 4;
            return (
              <Card
                key={kat}
                id={`slutdok-kat-${nr}`}
                className="slutdok-kategori"
                title={
                  <>
                    <span className="mr-1 text-ink-faint">{nr}.</span>
                    {kat}
                  </>
                }
                badge={
                  <>
                    {kritisk ? <StatusBadge ton="info" label="Krav för M6" /> : null}
                    <span data-roll="raknare" className="text-xs font-semibold tabular-nums text-ink-soft">
                      {klara}/{alla.length} godkända
                    </span>
                  </>
                }
              >
                <ul className="slutdok-lista">
                  {visade.map((d) => (
                    <Handling
                      key={d.id}
                      d={d}
                      last={slutdokArLast(d, pid, state)}
                      onSatt={(v) => sattStatus(d.id, v)}
                      onOppna={() => setOppenId(d.id)}
                    />
                  ))}
                </ul>
              </Card>
            );
          })
        ) : (
          <Card>
            <p className="m-0 text-[13px] text-ink-soft">
              Inget kvar att göra här — alla handlingar i urvalet är godkända.
            </p>
          </Card>
        )}
      </div>

      {oppen ? (
        <Slideover
          key={oppen.id}
          titel={oppen.krav}
          etikett={`Detaljer för ${oppen.krav}`}
          onStang={() => setOppenId(null)}
        >
          <div className="slutdok-panelkat">
            {oppen.kategori}
            {KRITISKA.includes(oppen.kategori) ? " · krav för M6" : ""}
          </div>

          {oppenLast ? (
            <Callout ton="warn">
              Låst tills kategori 1–4 är godkända — man kan inte slutbesikta mot ofullständigt underlag.
            </Callout>
          ) : (
            <div className="f">
              <span className="faltrubrik">Status</span>
              <Statusval d={oppen} onSatt={(v) => sattStatus(oppen.id, v)} />
            </div>
          )}

          <div className="f">
            <label htmlFor={`sd-ansvarig-${oppen.id}`}>Ansvarig</label>
            <Falt
              id={`sd-ansvarig-${oppen.id}`}
              varde={oppen.ansvarig}
              etikett={`Ansvarig för ${oppen.krav}`}
              placeholder="Roll eller leverantör"
              onCommit={(v) => uppd("slutdok", oppen.id, "ansvarig", v)}
            />
          </div>
          <div className="f">
            <label htmlFor={`sd-senast-${oppen.id}`}>Senast</label>
            <DatumFalt
              id={`sd-senast-${oppen.id}`}
              varde={oppen.senast}
              etikett={`Senast för ${oppen.krav}`}
              onCommit={(v) => uppd("slutdok", oppen.id, "senast", v)}
            />
          </div>
          <div className="f">
            <label htmlFor={`sd-referens-${oppen.id}`}>Referens</label>
            <Falt
              id={`sd-referens-${oppen.id}`}
              varde={oppen.referens}
              etikett={`Referens för ${oppen.krav}`}
              placeholder="Länk eller diarienr"
              onCommit={(v) => uppd("slutdok", oppen.id, "referens", v)}
            />
          </div>
          <div className="f">
            <label htmlFor={`sd-kommentar-${oppen.id}`}>Kommentar</label>
            <Falt
              id={`sd-kommentar-${oppen.id}`}
              flerrad
              varde={oppen.kommentar}
              etikett={`Kommentar för ${oppen.krav}`}
              placeholder="Vad saknas, vem har bollen, vad sa granskaren?"
              onCommit={(v) => uppd("slutdok", oppen.id, "kommentar", v)}
            />
          </div>
        </Slideover>
      ) : null}
    </>
  );
}
