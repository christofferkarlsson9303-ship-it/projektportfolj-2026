import { useState } from "react";
import {
  BatteryCharging,
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
import { Riskvarde } from "../ui/Primitiver.jsx";
import { PILL } from "../../data/konstanter.js";
import { VYMETA } from "../../data/vyer.js";
import { kortDatum } from "../../lib/datum.js";
import {
  bessNedrakning,
  oppnaRisker,
  projekt,
  riskKlass,
  riskMatrisFarg,
  riskvarde,
} from "../../lib/berakningar.js";
import { Lank, Ruta } from "./Ruta.jsx";

const kortNamn = (p) => p.nr || p.ort || p.namn;
const datumText = (iso) => {
  const k = kortDatum(iso);
  return `${k.dag} ${k.man}`;
};

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

/* ---------- Nästa BESS-leverans och long-lead ---------- */

function levText(l) {
  const namn = (PILL[l.status] || [undefined, l.status])[1];
  if (l.datum) return `${namn} · ${datumText(l.datum)}`;
  return l.status === "avvikelse" ? `${namn} — datum saknas` : `${namn} — utan datum`;
}

export function Leveranser({ i }) {
  const { state } = usePortfolj();
  const { visa } = useUi();
  const b = bessNedrakning(state);
  const bp = b ? projekt(state, b.projektId) : null;

  const lev = state.leveranser
    .filter((l) => l.status !== "levererad")
    .sort((x, y) => (x.datum || "9999").localeCompare(y.datum || "9999"));
  const visade = lev.slice(0, 5);

  return (
    <Ruta
      id="ov-bess"
      i={i}
      klass="ov-bess"
      ikon={BatteryCharging}
      titel={b && b.d < 0 ? "Senaste BESS-leverans" : "Nästa BESS-leverans"}
      under="Long-lead-leveranser, närmast först"
      atgard={
        <Lank onClick={() => visa("tidplan")} etikett="Öppna tidplanen">
          Tidplan
        </Lank>
      }
    >
      <BatteryCharging className="ov-bess-vattenmarke" size={170} strokeWidth={1.2} aria-hidden="true" />

      {b ? (
        <div>
          <div className="ov-hjalte">
            {b.d === 0 ? "Idag" : Math.abs(b.d)}
            {b.d !== 0 ? <small>{b.d < 0 ? "dagar sedan" : b.d === 1 ? "dag kvar" : "dagar kvar"}</small> : null}
          </div>
          <p className="ov-hjalte-under mt-2">
            {b.benamning}
            {b.leverantor && b.leverantor !== "—" ? ` från ${b.leverantor}` : ""} · {bp ? kortNamn(bp) + " " + (bp.ort || "") : ""}{" "}
            · {datumText(b.datum)}
          </p>
        </div>
      ) : (
        <p className="ov-hjalte-under m-0">Ingen BESS-leverans har bekräftat datum ännu.</p>
      )}

      {visade.length ? (
        <ul className="ov-lev-lista">
          {visade.map((l) => {
            const p = projekt(state, l.projektId);
            return (
              <li key={l.id}>
                <span>
                  <b>{p ? kortNamn(p) : l.projektId}</b>
                  {(l.benamning || "").split(" (")[0]}
                </span>
                <span className={`ov-lev ${l.status}`}>{levText(l)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {lev.length > visade.length ? (
        <p className="ov-hjalte-under m-0">+ {lev.length - visade.length} till i tidplanen</p>
      ) : null}
    </Ruta>
  );
}

/* ---------- Risker ---------- */

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
              <Riskvarde varde={riskvarde(r)} klass={riskKlass(riskvarde(r))} />
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
