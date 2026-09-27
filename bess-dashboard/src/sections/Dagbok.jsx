import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Pill, Tabellyta } from "../components/ui/Primitiver.jsx";
import { Callout, Card, StatTile } from "../components/ds/index.js";
import { Falt, DatumFalt, Kryss } from "../components/ui/Falt.jsx";
import { fmtSEK } from "../lib/format.js";
import { nyDagboksrad } from "../lib/nyaPoster.js";
import { dagbokGrupper, dagbokKomplett, projekt } from "../lib/berakningar.js";

/* Dagboken på designsystemet: kort med rubrik och åtgärd, nyckeltal överst
   och blanketten som ett eget kort med statusmärke. Kraven per ÄTA står som
   en lista i stället för i löptext. */

/** Det som ska stå för varje enskilt ÄTA (samma som DAGBOK_FALT). */
const KRAV = ["Startdatum", "Omfattning", "Väder och temperatur", "Kostnad", "Förväntad tidsåtgång", "Faktisk tidsåtgång"];

/* Fälten i mitten av blanketten. De sex som ingår i DAGBOK_FALT avgör om raden
   räknas som komplett — utan dem håller inte underlaget för fakturering. */
const RAD_TRE = [
  [
    ["vader", "Väder och temperatur", "Ex. 5°C, uppehåll"],
    ["kostnad", "Kostnad (kr)", ""],
    ["ombud", "Beställarens ombud", ""],
  ],
  [
    ["arbetsstyrka", "Arbetsstyrka på plats", "Ex. 4 montörer + 1 maskinist"],
    ["hinder", "Hinder", "Ex. väntar på besked om massor"],
    ["incidenter", "Incidenter / tillbud", "Ex. inga"],
  ],
];

/* ---------- Blanketten ---------- */

function Dagboksformular({ d, onStang }) {
  const { uppd, uppdBool, taBort } = usePortfolj();
  const { bekrafta, visaToast } = useUi();

  const taBortRad = async () => {
    const ja = await bekrafta("Dagboksraden tas bort. Åtgärden går inte att ångra.", {
      titel: "Ta bort dagboksraden?",
      ok: "Ta bort",
      fara: true,
    });
    if (!ja) return;
    taBort("dagbok", d.id);
    onStang();
    visaToast("Dagboksraden borttagen", "warn");
  };

  const falt = (nyckel, rubrik, placeholder) => (
    <div className="f" key={nyckel}>
      <label htmlFor={`${nyckel}-${d.id}`}>{rubrik}</label>
      <Falt
        id={`${nyckel}-${d.id}`}
        varde={d[nyckel] || ""}
        placeholder={placeholder}
        etikett={rubrik}
        onCommit={(v) => uppd("dagbok", d.id, nyckel, v)}
      />
    </div>
  );

  return (
    <Card
      id={`dagboksrad-${d.id}`}
      title={`Dagboksrad — ${d.ataRef || "utan ÄTA-nummer"}`}
      badge={<Pill status={dagbokKomplett(d) ? "klar" : "komplettering"} />}
      action={
        <button type="button" className="btn sec mini" onClick={onStang}>
          Stäng
        </button>
      }
    >
      <div>
        <div className="frow c2">
          {falt("ataRef", "ÄTA-/UR-nummer", "Ex. UR006, ST001")}
          {falt("titel", "Titel / kort beskrivning", "")}
        </div>

        <div className="f">
          <label htmlFor={`startdatum-${d.id}`}>Startdatum för ÄTA</label>
          <DatumFalt
            id={`startdatum-${d.id}`}
            varde={d.startdatum}
            etikett="Startdatum för ÄTA"
            style={{ maxWidth: 200 }}
            onCommit={(v) => uppd("dagbok", d.id, "startdatum", v)}
          />
        </div>

        <div className="f">
          <label htmlFor={`omfattning-${d.id}`}>Omfattning</label>
          <p className="guide">Hur mycket arbete som krävts.</p>
          <Falt
            id={`omfattning-${d.id}`}
            flerrad
            varde={d.omfattning || ""}
            etikett="Omfattning"
            onCommit={(v) => uppd("dagbok", d.id, "omfattning", v)}
          />
        </div>

        {RAD_TRE.map((rad, i) => (
          <div className="frow c3" key={i}>
            {rad.map(([nyckel, rubrik, ph]) => falt(nyckel, rubrik, ph))}
          </div>
        ))}

        <div className="frow c2">
          {falt("forvantadTid", "Förväntad tidsåtgång", "Ex. 8 tim")}
          {falt("faktiskTid", "Faktisk tidsåtgång", "Ex. 11,5 tim")}
        </div>

        <Kryss
          id={`sign-${d.id}`}
          checked={d.kravSignering}
          onChange={(v) => uppdBool("dagbok", d.id, "kravSignering", v)}
        >
          Beställaren ska enligt kontraktet skriva under dagboken
        </Kryss>

        {d.kravSignering ? (
          <Kryss
            id={`signd-${d.id}`}
            checked={d.signerad}
            onChange={(v) => uppdBool("dagbok", d.id, "signerad", v)}
          >
            Skickad för signering / signerad
          </Kryss>
        ) : null}

        <Kryss
          id={`fakt-${d.id}`}
          checked={d.fakturerad}
          onChange={(v) => uppdBool("dagbok", d.id, "fakturerad", v)}
        >
          Fakturerad till beställaren
        </Kryss>

        <div className="f mb-0">
          <label htmlFor={`notering-${d.id}`}>Övrigt</label>
          <Falt
            id={`notering-${d.id}`}
            flerrad
            varde={d.notering || ""}
            etikett="Övrig notering"
            onCommit={(v) => uppd("dagbok", d.id, "notering", v)}
          />
        </div>
      </div>

      {dagbokKomplett(d) ? null : (
        <Callout ton="warn">
          <b>Ofullständig rad.</b> Startdatum, omfattning, väder/temperatur, kostnad samt förväntad och
          faktisk tidsåtgång ska alla vara ifyllda för varje enskilt ÄTA.
        </Callout>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn sec" onClick={taBortRad}>
          Ta bort
        </button>
      </div>
    </Card>
  );
}

/* ---------- Sektionen ---------- */

export function Dagbok() {
  const { state, laggTill } = usePortfolj();
  const { valtProjekt: pid, postFokus } = useUi();
  const [oppen, setOppen] = useState(null);

  const p = projekt(state, pid);

  const grupper = useMemo(() => dagbokGrupper(state, pid), [state, pid]);
  const rader = useMemo(
    () =>
      state.dagbok
        .filter((d) => d.projektId === pid)
        .sort((a, b) => (b.startdatum || "").localeCompare(a.startdatum || "")),
    [state.dagbok, pid]
  );

  /* ÄTA och Störning kan be oss öppna en nyskapad rad. Justering under render
     i stället för en effekt — panelen hinner då öppnas i samma målning. */
  const [sedd, setSedd] = useState(null);
  if (postFokus?.vy === "dagbok" && postFokus.tid !== sedd) {
    setSedd(postFokus.tid);
    setOppen(postFokus.id);
  }

  const oppnaRad = rader.find((d) => d.id === oppen) || null;

  if (!p) return null;

  const nyRad = (ataRef = "") => {
    const rad = nyDagboksrad(pid, { ataRef });
    laggTill("dagbok", rad);
    setOppen(rad.id);
  };

  const komplett = rader.filter(dagbokKomplett).length;
  const kostnad = grupper.reduce((sum, g) => sum + g.kostnad, 0);
  const ejFakturerade = grupper.filter((g) => !g.fakturerad).length;

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <Card
          id="dagbok-rubrik"
          title="Dagbok — underlag för ÄTA"
          subtitle="Underlaget som ger rätt till mer betalt och/eller tidsförlängning. Utforma dagboken på det sätt beställaren begärt enligt kontraktet."
          action={
            <button type="button" className="btn" onClick={() => nyRad()}>
              + Ny dagboksrad
            </button>
          }
        >
          <div className="flex flex-col gap-2">
            <h4 className="m-0 font-body text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Ska stå för varje enskilt ÄTA
            </h4>
            <ul aria-label="Krav per ÄTA" className="m-0 flex list-none flex-wrap gap-2 p-0">
              {KRAV.map((k) => (
                <li
                  key={k}
                  className="rounded-full bg-sunken px-3 py-1 text-xs font-semibold text-ink ring-1 ring-inset ring-hairline-stark"
                >
                  {k}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile label="Dagboksrader" value={rader.length} hint={`${grupper.length} ÄTA/UR med underlag`} />
          <StatTile
            label="Kompletta rader"
            value={`${komplett}/${rader.length}`}
            ton={komplett < rader.length ? "warn" : ""}
            hint={komplett < rader.length ? `${rader.length - komplett} behöver kompletteras` : "alla sex fält ifyllda"}
          />
          <StatTile label="Kostnad i dagboken" value={fmtSEK(kostnad)} hint="underlag för fakturering" />
          <StatTile
            label="Ej fakturerade ÄTA"
            value={ejFakturerade}
            ton={ejFakturerade ? "warn" : ""}
            hint={ejFakturerade ? "fakturera med utdrag ur dagboken" : "allt är fakturerat"}
          />
        </div>

        <Card
          id="dagbok-sammanstallning"
          title="Sammanställning per ÄTA"
          subtitle={`${p.nr} ${p.namn} · underlag för fakturering`}
        >
          {grupper.length ? (
            <>
              <Tabellyta etikett="Sammanställning per ÄTA">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">ÄTA</th>
                      <th scope="col" className="num">
                        Rader
                      </th>
                      <th scope="col" className="num">
                        Kostnad
                      </th>
                      <th scope="col" style={{ width: 120 }}>
                        Dokumentation
                      </th>
                      <th scope="col" style={{ width: 120 }}>
                        Signering
                      </th>
                      <th scope="col" style={{ width: 120 }}>
                        Fakturerad
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupper.map((g) => (
                      <tr key={g.ataRef}>
                        <td data-label="ÄTA">
                          <b>{g.ataRef}</b>
                        </td>
                        <td data-label="Rader" className="num">
                          {g.rader.length}
                        </td>
                        <td data-label="Kostnad" className="num">
                          {fmtSEK(g.kostnad)}
                        </td>
                        <td data-label="Dokumentation">
                          <Pill status={g.komplett ? "klar" : "komplettering"} />
                        </td>
                        <td data-label="Signering">
                          {g.kravSignering ? (
                            <Pill status={g.signering ? "klar" : "oppen"} />
                          ) : (
                            <span className="text-[12px] text-ink-faint">Inget krav</span>
                          )}
                        </td>
                        <td data-label="Fakturerad">
                          <Pill status={g.fakturerad ? "fakturerad" : "kvar"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Tabellyta>

              <Callout>
                <b>Att fakturera för ÄTA.</b> Kontrollera att ni fakturerat enligt vad kontraktet säger och
                bifogat utdrag ur dagboken. Har ÄTA-arbetet gjort att kalkylen för entreprenaden inte längre
                håller — se á-priskontrollen under Ekonomi och flödesschemat När One vill ha mer betalt.
              </Callout>
            </>
          ) : (
            <p className="m-0 text-[13px] text-ink-soft">Inga dagboksrader registrerade ännu för {p.nr || p.namn}.</p>
          )}
        </Card>

        <Card
          id="dagbok-alla"
          title="Alla rader"
          subtitle="Sortera på valfri kolumn eller filtrera på ÄTA-nummer."
          action={<Tathetsvaljare />}
        >
          <DataTable
            etikett="Alla dagboksrader"
            exportNamn="Dagbok"
            rader={rader}
            tomText="Inga rader."
            radKlass={(d) => (dagbokKomplett(d) ? "" : "rad-sen")}
            kolumner={[
              {
                nyckel: "ataRef",
                rubrik: "ÄTA",
                bredd: 120,
                filter: true,
                filterEtikett: (v) => v || "—",
                render: (d) => (
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 font-bold text-one-bla underline decoration-dotted"
                    onClick={() => setOppen(oppen === d.id ? null : d.id)}
                    aria-expanded={oppen === d.id}
                  >
                    {d.ataRef || "—"}
                    <span className="sr-only"> — öppna dagboksraden</span>
                  </button>
                ),
              },
              { nyckel: "titel", rubrik: "Titel" },
              { nyckel: "startdatum", rubrik: "Startdatum", bredd: 130 },
              {
                nyckel: "kostnad",
                rubrik: "Kostnad",
                bredd: 120,
                typ: "sek",
                summera: true,
                sortVarde: (d) => Number(d.kostnad) || 0,
                render: (d) => (d.kostnad ? fmtSEK(Number(d.kostnad)) : "—"),
              },
              { nyckel: "forvantadTid", rubrik: "Fört. tid", bredd: 110 },
              { nyckel: "faktiskTid", rubrik: "Fakt. tid", bredd: 110 },
              {
                nyckel: "komplett",
                rubrik: "Komplett",
                bredd: 130,
                sortVarde: (d) => (dagbokKomplett(d) ? 1 : 0),
                textVarde: (d) => (dagbokKomplett(d) ? "Klar" : "Komplettering"),
                exportVarde: (d) => (dagbokKomplett(d) ? "Klar" : "Komplettering"),
                render: (d) => <Pill status={dagbokKomplett(d) ? "klar" : "komplettering"} />,
              },
            ]}
          />
        </Card>

        {oppnaRad ? <Dagboksformular d={oppnaRad} onStang={() => setOppen(null)} /> : null}
      </div>
    </>
  );
}
