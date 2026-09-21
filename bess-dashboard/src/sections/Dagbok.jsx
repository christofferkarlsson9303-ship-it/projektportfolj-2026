import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Note, Pill, Tabellyta } from "../components/ui/Primitiver.jsx";
import { Falt, DatumFalt, Kryss } from "../components/ui/Falt.jsx";
import { fmtSEK } from "../lib/format.js";
import { idag } from "../lib/datum.js";
import { dagbokGrupper, dagbokKomplett, projekt } from "../lib/berakningar.js";

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
    <section
      className="card"
      role="region"
      aria-label={`Dagboksrad ${d.ataRef || "utan ÄTA-nummer"}`}
      style={{ marginTop: 16 }}
    >
      <div className="kortrad">
        <div style={{ minWidth: 0 }}>
          <h3>Dagboksrad — {d.ataRef || "utan ÄTA-nummer"}</h3>
          <div className="lead" style={{ marginBottom: 0 }}>
            {dagbokKomplett(d) ? <Pill status="klar" /> : <Pill status="komplettering" />}
          </div>
        </div>
        <div className="kortverktyg">
          <button type="button" className="btn sec mini" onClick={onStang}>
            Stäng
          </button>
        </div>
      </div>

      <div className="frow c2" style={{ marginTop: 14 }}>
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

      <div className="f">
        <label htmlFor={`notering-${d.id}`}>Övrigt</label>
        <Falt
          id={`notering-${d.id}`}
          flerrad
          varde={d.notering || ""}
          etikett="Övrig notering"
          onCommit={(v) => uppd("dagbok", d.id, "notering", v)}
        />
      </div>

      {dagbokKomplett(d) ? null : (
        <Note>
          <b>Ofullständig rad.</b> Startdatum, omfattning, väder/temperatur, kostnad samt förväntad och
          faktisk tidsåtgång ska alla vara ifyllda för varje enskilt ÄTA.
        </Note>
      )}

      <div className="rowbtns">
        <button type="button" className="btn sec" onClick={taBortRad}>
          Ta bort
        </button>
      </div>
    </section>
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
    const id = "d" + Date.now();
    laggTill("dagbok", {
      id,
      projektId: pid,
      ataRef,
      titel: "",
      startdatum: idag(),
      omfattning: "",
      vader: "",
      kostnad: "",
      ombud: "",
      forvantadTid: "",
      faktiskTid: "",
      kravSignering: false,
      signerad: false,
      fakturerad: false,
      notering: "",
    });
    setOppen(id);
  };

  return (
    <>
      <Projektvaljare />

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Dagbok — underlag för ÄTA</h3>
        <div className="lead">
          För varje enskilt ÄTA ska dagboken innehålla: startdatum, omfattningen av arbetet, väder och
          temperatur under utförandet, kostnad, samt förväntad och faktisk tidsåtgång. Detta är underlaget
          som ger rätt till mer betalt och/eller tidsförlängning — utforma dagboken på det sätt beställaren
          begärt enligt kontraktet.
        </div>
        <div className="rowbtns">
          <button type="button" className="btn" onClick={() => nyRad()}>
            + Ny dagboksrad
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Sammanställning per ÄTA</h3>
        <div className="lead">
          {p.nr} {p.namn} · underlag för fakturering
        </div>

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

            <Note>
              <b>Att fakturera för ÄTA.</b> Kontrollera att ni fakturerat enligt vad kontraktet säger och
              bifogat utdrag ur dagboken. Har ÄTA-arbetet gjort att kalkylen för entreprenaden inte längre
              håller — se á-priskontrollen under Ekonomi och flödesschemat När One vill ha mer betalt.
            </Note>
          </>
        ) : (
          <p className="lead">Inga dagboksrader registrerade ännu för {p.nr || p.namn}.</p>
        )}
      </div>

      <div className="card">
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>Alla rader</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              Sortera på valfri kolumn eller filtrera på ÄTA-nummer.
            </div>
          </div>
          <div className="kortverktyg">
            <Tathetsvaljare />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
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
        </div>
      </div>

      {oppnaRad ? <Dagboksformular d={oppnaRad} onStang={() => setOppen(null)} /> : null}
    </>
  );
}
