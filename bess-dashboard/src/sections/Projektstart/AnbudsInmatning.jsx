import { Plus, Trash2 } from "lucide-react";
import {
  AVTALSSTATUS,
  AVTAL_ID,
  MATRISNIVAER,
  NYCKELROLLER,
  OMFATTNING_RADER,
  OMFATTNING_VAL,
  QA_RADER,
  QA_STATUS,
  ROLLSTATUS,
  anbudsKonsId,
  anbudsRollId,
  anbudsSannId,
  matrisFalt,
} from "../../data/anbudsfragor.js";
import { BESLUT } from "../../data/projektstartSteg.js";
import { nyTabellrad } from "../../lib/projektstart.js";

/* Inmatningen i ett frågekort, efter frågans typ (data/anbudsfragor.js). Varje ändring går
   genom `andra(falt, rader)`, som Anbudsfragor.jsx använder för att skriva fälten och sedan
   föreslå trafikljuset. Fält som redan finns i andra steg (datum, kassaflöde, PL:s
   rekommendation) återanvänds med samma id, så att det bara finns ett svar. */

const VAL = "min-h-[30px] rounded-md border border-solid border-hairline-stark bg-surface px-1.5 text-[12px] text-ink";
const ETIKETT = "flex flex-col gap-1 text-[12px] text-ink-soft";

function Knappval({ etikett, alternativ, varde, onVal }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={etikett}>
      {alternativ.map((a) => (
        <button
          key={a.id}
          type="button"
          title={a.text}
          aria-pressed={varde === a.id}
          onClick={() => onVal(varde === a.id ? "" : a.id)}
          className={`rounded-full border border-solid px-3 py-1 text-[12px] font-bold transition-colors duration-150 ${varde === a.id ? "border-ink bg-ink text-surface" : "border-hairline-stark bg-transparent text-ink-soft hover:bg-sunken"}`}
        >
          {a.namn}
        </button>
      ))}
    </div>
  );
}

function Matris({ fraga, v, andra, rubrik }) {
  const satt = (falt, varde) => {
    const ny = { sannolikhet: Number(v[anbudsSannId(fraga)]) || null, konsekvens: Number(v[anbudsKonsId(fraga)]) || null, [falt]: varde };
    if (ny.sannolikhet && ny.konsekvens) andra(matrisFalt(fraga, ny));
    else andra({ [falt === "sannolikhet" ? anbudsSannId(fraga) : anbudsKonsId(fraga)]: varde || "" });
  };
  const lista = (falt, etikett, id) => (
    <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
      {etikett}
      <select className={VAL} value={v[id] || ""} onChange={(e) => satt(falt, Number(e.target.value) || null)}>
        <option value="">–</option>
        {MATRISNIVAER.map((n) => (
          <option key={n.varde} value={n.varde}>
            {n.namn}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="flex flex-wrap items-center gap-3">
      {rubrik ? <span className="text-[12px] font-bold text-ink-soft">{rubrik}</span> : null}
      {lista("sannolikhet", "Sannolikhet", anbudsSannId(fraga))}
      {lista("konsekvens", "Konsekvens", anbudsKonsId(fraga))}
    </div>
  );
}

function Rader({ titel, kolumner, rader, onRader }) {
  const tabell = { kolumner };
  // En rad per rad från sm och uppåt; på mobil staplas fälten i ett litet kort.
  const spalter = { "--spalter": `${kolumner.map((k) => (k.bred ? "minmax(0,2fr)" : "minmax(0,1fr)")).join(" ")} auto` };
  const uppd = (id, k, x) => onRader(rader.map((r) => (r.id === id ? { ...r, [k]: x } : r)));
  return (
    <div className="flex flex-col gap-2">
      {rader.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={titel}>
          {rader.map((r, i) => (
            <li key={r.id} className="grid grid-cols-1 items-center gap-1.5 rounded-md border border-solid border-hairline p-1.5 sm:border-0 sm:p-0 sm:[grid-template-columns:var(--spalter)]" style={spalter}>
              {kolumner.map((k) => {
                const namn = `${titel}, rad ${i + 1}: ${k.etikett}`;
                return k.alternativ ? (
                  <select key={k.id} aria-label={namn} className={`${VAL} w-full min-w-0`} value={r[k.id] || ""} onChange={(e) => uppd(r.id, k.id, e.target.value)}>
                    {k.alternativ.map((a) => (
                      <option key={a} value={a}>
                        {a || "Välj …"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    key={k.id}
                    aria-label={namn}
                    type={k.typ || "text"}
                    placeholder={k.etikett}
                    className={`${VAL} w-full min-w-0`}
                    value={r[k.id] || ""}
                    onChange={(e) => uppd(r.id, k.id, e.target.value)}
                  />
                );
              })}
              <button type="button" className="btn sec mini justify-self-end" aria-label={`Ta bort rad ${i + 1} i ${titel}`} onClick={() => onRader(rader.filter((x) => x.id !== r.id))}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="btn sec mini self-start" onClick={() => onRader([...rader, nyTabellrad(tabell)])}>
        <Plus size={14} aria-hidden="true" /> {titel}: lägg till rad
      </button>
    </div>
  );
}

const BESLUTSVAL = [
  { id: BESLUT[0], namn: "Lämna anbud", text: "PL rekommenderar att anbud lämnas, med de villkor som står nedan." },
  { id: BESLUT[1], namn: "Kräver ledningens beslut", text: "Skjut upp: ledningen måste ta ställning först." },
  { id: BESLUT[2], namn: "Lämna inte anbud", text: "Tacka nej. Orsaken anges under Avropsacceptans." },
];

export function AnbudsInmatning({ fraga, v, rader, andra }) {
  switch (fraga.typ) {
    case "matris":
      return <Matris fraga={fraga} v={v} andra={andra} />;
    case "tid":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            {[
              ["anbudsdag", "Anbudet lämnas senast"],
              ["startdatum", "Start"],
              ["fardigdatum", "Färdigställande"],
            ].map(([id, namn]) => (
              <label key={id} className={ETIKETT}>
                {namn}
                <input type="date" className={VAL} value={v[id] || ""} onChange={(e) => andra({ [id]: e.target.value })} />
              </label>
            ))}
          </div>
          <Matris fraga={fraga} v={v} andra={andra} rubrik="Risk för försening:" />
        </div>
      );
    case "avtal":
      return <Knappval etikett="Avtalet mot standard" alternativ={AVTALSSTATUS} varde={v[AVTAL_ID] || ""} onVal={(x) => andra({ [AVTAL_ID]: x })} />;
    case "resurser":
      return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2" role="group" aria-label="Nyckelroller">
          {NYCKELROLLER.map((r) => (
            <label key={r.id} className={ETIKETT}>
              {r.namn}
              <select className={VAL} value={v[anbudsRollId(r)] || ""} onChange={(e) => andra({ [anbudsRollId(r)]: e.target.value })}>
                <option value="">–</option>
                {ROLLSTATUS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.namn}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      );
    case "omfattning":
      return (
        <Rader
          titel="Gränsdragning"
          kolumner={[
            { id: "del", etikett: "Del eller gränssnitt", bred: true },
            { id: "val", etikett: "Ingår", alternativ: ["", ...OMFATTNING_VAL] },
            { id: "ansvar", etikett: "Ansvar / FFU-ref" },
          ]}
          rader={rader[OMFATTNING_RADER] || []}
          onRader={(r) => andra(null, { [OMFATTNING_RADER]: r })}
        />
      );
    case "qa":
      return (
        <Rader
          titel="Frågor och svar"
          kolumner={[
            { id: "datum", etikett: "Datum", typ: "date" },
            { id: "fraga", etikett: "Fråga", bred: true },
            { id: "svar", etikett: "Svar och påverkan", bred: true },
            { id: "status", etikett: "Status", alternativ: QA_STATUS, standard: QA_STATUS[0] },
          ]}
          rader={rader[QA_RADER] || []}
          onRader={(r) => andra(null, { [QA_RADER]: r })}
        />
      );
    case "betalning":
      return (
        <div className="flex flex-wrap gap-3">
          <label className={ETIKETT}>
            Största belopp vi ligger ute med (kr)
            <input className={VAL} placeholder="-2,4 Mkr" value={v.kassaflodeLagst || ""} onChange={(e) => andra({ kassaflodeLagst: e.target.value })} />
          </label>
          <label className={ETIKETT}>
            Längsta negativa period
            <input className={VAL} placeholder="3 månader" value={v.kassaflode || ""} onChange={(e) => andra({ kassaflode: e.target.value })} />
          </label>
        </div>
      );
    case "beslut":
      return <Knappval etikett="PL:s rekommendation" alternativ={BESLUTSVAL} varde={v.beslut || ""} onVal={(x) => andra({ beslut: x })} />;
    default:
      return null;
  }
}
