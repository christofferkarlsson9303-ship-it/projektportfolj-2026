import { usePortfolj, useUi } from "../state/hooks.js";
import { Bestallarrapport } from "../components/ui/Bestallarrapport.jsx";
import { Card, Kortrubrik, Kpi } from "../components/ui/Primitiver.jsx";
import { ataSummering, slutdokIndex } from "../lib/berakningar.js";
import { berakFlaggor } from "../lib/flaggor.js";
import { dagarTill } from "../lib/datum.js";
import { fmtProcent, fmtSEK } from "../lib/format.js";
import { VYMETA } from "../data/vyer.js";

/* Beställarrapporten. Vyn visar vad rapporten kommer att innehålla och låter
   den skrivas ut som PDF — själva dokumentet ligger i Bestallarrapport.jsx och
   renderas i utskriftsytan, inte här. */
export function Rapport() {
  const { state } = usePortfolj();
  const { valtProjekt: pid, skrivUt } = useUi();
  const meta = VYMETA.rapport || { namn: "Beställarrapport", lead: "" };

  const projekt = state.projekt.find((p) => p.id === pid) || null;
  const horTill = (r) => !pid || r.projektId === pid;

  const milstolpar = state.milstolpar.filter(horTill);
  const kvar = milstolpar.filter((m) => m.status !== "klar");
  const forsenade = kvar.filter((m) => m.datum && dagarTill(m.datum) < 0);
  const oppnaPunkter = state.punkter.filter((p) => horTill(p) && p.status === "oppen");
  const risker = state.risker.filter((r) => horTill(r) && r.status !== "stangd");
  const ata = pid ? ataSummering(state, pid) : null;
  const slutdok = pid ? slutdokIndex(state, pid) : null;
  const hoga = berakFlaggor(state).filter((f) => f.niva === "hog" && (!pid || f.projektId === pid));

  const nyckeltal = [
    ["Milstolpar kvar", String(kvar.length)],
    ["Varav försenade", String(forsenade.length)],
    ["Öppna punkter", String(oppnaPunkter.length)],
    ["Öppna risker", String(risker.length)],
    ["Slutdokumentation", slutdok ? fmtProcent(slutdok.proc) : "—"],
  ];

  return (
    <Card>
      <Kortrubrik
        titel={meta.namn}
        lead={meta.lead}
        verktyg={
          <button type="button" className="btn" onClick={() => skrivUt(<Bestallarrapport state={state} pid={pid} />)}>
            Skriv ut som PDF
          </button>
        }
      />

      <div className="note">
        Rapporten speglar läget just nu och tar med det som är försenat eller kräver beslut. Välj projekt
        i projektväljaren för en projektrapport — utan val omfattar den hela portföljen.
      </div>

      <div className="grid g4" style={{ marginTop: 16 }}>
        {nyckeltal.map(([namn, varde]) => (
          <Kpi key={namn} label={namn} varde={varde} />
        ))}
      </div>

      {ata ? (
        <p className="lead" style={{ marginTop: 16 }}>
          ÄTA: {ata.antal} ärenden varav {ata.oppna} öppna. Godkänt {fmtSEK(ata.godkant)}, varav{" "}
          {fmtSEK(ata.ejFakt)} ännu inte fakturerat.
          {projekt?.kontraktsvarde ? ` Kontraktsvärde ${fmtSEK(projekt.kontraktsvarde)}.` : ""}
        </p>
      ) : null}

      {hoga.length ? (
        <>
          <h3 style={{ marginTop: 20 }}>Kommer med som &quot;kräver beslut eller åtgärd&quot; ({hoga.length})</h3>
          <ul>
            {hoga.slice(0, 12).map((f, i) => (
              <li key={i}>{f.text}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="lead" style={{ marginTop: 16 }}>
          Inget är flaggat som högt just nu — rapporten blir kort.
        </p>
      )}
    </Card>
  );
}
