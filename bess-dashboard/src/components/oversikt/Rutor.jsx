import { useState } from "react";
import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Database,
  FileDiff,
  Flag,
  FolderCheck,
  HardHat,
  ListChecks,
  NotebookPen,
  ShieldAlert,
  Siren,
  Target,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PTag } from "../ui/PTag.jsx";
import { VYMETA } from "../../data/vyer.js";
import {
  oppnaRisker,
  riskMatrisFarg,
  riskvarde,
} from "../../lib/berakningar.js";
import { Lank, Ruta } from "./Ruta.jsx";
import { RiskScore } from "../ds/index.js";


/* ---------- Kräver uppmärksamhet ---------- */

const VY_IKON = {
  punkter: ListChecks,
  risker: ShieldAlert,
  ata: FileDiff,
  hseq: HardHat,
  tidplan: CalendarClock,
  moten: Users,
  slutdok: FolderCheck,
  oversikt: Database,
  milstolpar: Flag,
  vecka: ClipboardCheck,
  dagbok: NotebookPen,
  storning: TriangleAlert,
  handlingsplan: Target,
  ekonomi: Wallet,
};

const FLIKAR = [
  ["alla", "Alla"],
  ["hog", "Akuta"],
  ["medel", "Bevaka"],
];

/* Hur många rader som syns innan listan fälls ut. Resten av rutnätet ska
   synas utan att man rullar förbi en lång lista. */
const GRANS = 7;

export function Uppmarksamhet({ lista, flik, setFlik, i }) {
  const { state } = usePortfolj();
  const { oppnaFlagga } = useUi();
  const [visaAlla, setVisaAlla] = useState(false);

  const akuta = lista.filter((f) => f.niva === "hog");
  const antal = { alla: lista.length, hog: akuta.length, medel: lista.length - akuta.length };
  const filtrerad = flik === "hog" ? akuta : flik === "medel" ? lista.filter((f) => f.niva !== "hog") : lista;
  const visade = visaAlla ? filtrerad : filtrerad.slice(0, GRANS);

  return (
    <Ruta
      id="ov-uppm"
      i={i}
      ikon={Siren}
      ikonTon={akuta.length ? "bad" : ""}
      titel="Kräver uppmärksamhet"
      under="Frister, förfallet och luckor — beräknat automatiskt över alla projekt"
      klass="md:col-span-2 xl:row-span-2"
    >
      {lista.length ? (
        <>
          <div className="ov-flikar" role="group" aria-label="Visa">
            {FLIKAR.map(([id, namn]) => (
              <button
                key={id}
                type="button"
                className={id}
                aria-pressed={flik === id}
                onClick={() => {
                  setFlik(id);
                  setVisaAlla(false);
                }}
              >
                {namn} <b>{antal[id]}</b>
              </button>
            ))}
          </div>

          {visade.length ? (
            <ul className="ov-flista">
              {visade.map((f, n) => {
                const Ikon = VY_IKON[f.vy] || Flag;
                const kandProjekt = state.projekt.some((p) => p.id === f.projektId);
                return (
                  <li key={`${f.vy}-${f.text}-${n}`}>
                    <button
                      type="button"
                      className={`ov-frad ${f.niva}`}
                      onClick={() => oppnaFlagga(kandProjekt ? f.projektId : "", f.vy, f.extra)}
                    >
                      <span className={`ov-ikon ${f.niva === "hog" ? "bad" : ""}`.trim()} aria-hidden="true">
                        <Ikon size={15} strokeWidth={2} />
                      </span>
                      <span className="ov-ftext">
                        <span>
                          {f.niva === "hog" ? <span className="sr-only">Akut: </span> : null}
                          {f.text}
                        </span>
                        <span className="ov-fmeta">
                          {f.projektId ? <PTag pid={f.projektId} /> : null}
                          <span>{VYMETA[f.vy]?.namn || f.vy}</span>
                        </span>
                      </span>
                      <ChevronRight className="ov-fpil" size={16} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="lead m-0">Inget i den här kategorin just nu.</p>
          )}

          {filtrerad.length > GRANS ? (
            <div>
              <button
                type="button"
                className="btn sec mini"
                onClick={() => setVisaAlla((v) => !v)}
                aria-expanded={visaAlla}
              >
                {visaAlla ? "Visa färre" : `Visa alla ${filtrerad.length}`}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="ov-tom">
          <CircleCheck size={20} aria-hidden="true" />
          Inget kräver åtgärd just nu — alla frister och grindar är gröna.
        </div>
      )}
    </Ruta>
  );
}

export function Risker({ i }) {
  const { state } = usePortfolj();
  const { visa } = useUi();
  const risker = oppnaRisker(state);
  const roda = risker.filter((r) => riskMatrisFarg(r.sannolikhet, r.konsekvens) === "rod").length;
  const topp = [...risker].sort((a, b) => riskvarde(b) - riskvarde(a)).slice(0, 5);

  return (
    <Ruta
      id="ov-risker"
      i={i}
      ikon={ShieldAlert}
      ikonTon={roda ? "bad" : ""}
      titel="Högsta riskvärden"
      under={`${risker.length} öppna · ${roda} röda i riskmatrisen`}
      klass="md:col-span-2 xl:col-span-1"
      atgard={
        <Lank onClick={() => visa("risker")} etikett="Öppna alla risker">
          Alla
        </Lank>
      }
    >
      {topp.length ? (
        <ol className="ov-risklista">
          {topp.map((r) => (
            <li key={r.id}>
              <RiskScore value={riskvarde(r)} />
              <div className="min-w-0">
                <p>{r.titel}</p>
                <PTag pid={r.projektId} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="lead m-0">Inga öppna risker.</p>
      )}
    </Ruta>
  );
}
