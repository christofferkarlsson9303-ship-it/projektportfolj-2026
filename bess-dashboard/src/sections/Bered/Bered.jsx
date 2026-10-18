import { useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Projektvaljare } from "../../components/ui/Projektvaljare.jsx";
import { Callout, Card, StatTile, StatusBadge, TableRegion } from "../../components/ds/index.js";
import { fmtKompakt, fmtSEK, fmtTal } from "../../lib/format.js";
import { laddaNer } from "../../lib/export.js";
import { profilFor } from "../../data/hardvaruprofiler.js";
import { BIBLIOTEK, GEN_STANDARD, SERIER, byggKonstruktion, genereraBess, kontrollera } from "../../lib/bered/bibliotek.js";
import { KF_DJUP, KF_GRP, KF_RHO, KF_TEMP, MVKABEL } from "../../lib/bered/kabel.js";
import { beraknaKalkyl, kabellista, kabellistaCsv, materiellista } from "../../lib/bered/kalkyl.js";
import { useBered } from "./useBered.js";

/* ONE Bered — beredning, kalkyl och kabellista för batteriparken.

   Generatorn bygger skrivbordet ur MW, MWh och layoutdata: battericontainrar, MV-skids, radialer
   med dimensionerad MV-kabel, ställverk, hjälpkraft, fiber, jordnät, mark och etablering. Ur det
   kommer materiellista med E-nr, kabellista enligt Konstruktionshandbok EL och en kalkyl på KLG
   1:26 P2 plus BESS-schablon. ÄTA, tid och fakturering ligger kvar i sina egna vyer. */

const FLIKAR = [
  ["generator", "Generator"],
  ["skrivbord", "Skrivbord"],
  ["kabel", "Kabellista"],
  ["materiel", "Materiel"],
  ["kalkyl", "Kalkyl"],
];

const tal = "text-right tabular-nums";
const ton = (r) => (r === null ? "neutral" : r.ok === true ? "ok" : r.ok === false ? "bad" : "warn");
const tonText = (r) => (r.ok === true ? "Dim. OK" : r.ok === false ? "Underkänd" : "Verifiera");

function Kontroll({ r }) {
  if (!r) return null;
  return <StatusBadge ton={ton(r)} label={tonText(r)} />;
}

function Val({ id, etikett, varde, alternativ, onChange }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12px] font-bold text-ink-soft" htmlFor={id}>
      {etikett}
      <select id={id} value={varde} onChange={(e) => onChange(e.target.value)}>
        {alternativ.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </label>
  );
}

function Tal({ id, etikett, varde, onChange, steg = "any" }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12px] font-bold text-ink-soft" htmlFor={id}>
      {etikett}
      <input id={id} type="number" step={steg} value={varde} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
    </label>
  );
}

const rutnat = "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]";

function Generator({ p, indata, setIndata, kor, harUnderlag }) {
  const profil = profilFor(p);
  const set = (k) => (v) => setIndata({ ...indata, [k]: v });
  return (
    <Card title="BESS-generator" subtitle={`Hårdvaruprofil: ${profil.namn}. Ange värden enligt leverantörens datablad.`}>
      {!profil.container.mwh ? (
        <Callout ton="warn">
          <b>MWh per container saknas i profilen.</b> {profil.container.benamning} har ingen verifierad kapacitet i appens underlag. Värdet nedan är ditt antagande tills databladet finns.
        </Callout>
      ) : null}
      <div className={rutnat}>
        <Tal id="g-mw" etikett="Effekt (MW)" varde={indata.mw} onChange={set("mw")} />
        <Tal id="g-mwh" etikett="Energi (MWh)" varde={indata.mwh} onChange={set("mwh")} />
        <Tal id="g-mwhc" etikett="MWh per battericontainer" varde={indata.mwhC} onChange={set("mwhC")} />
        <Tal id="g-mws" etikett="MW per MV-skid" varde={indata.mwS} onChange={set("mwS")} />
        <Tal id="g-spr" etikett="MV-skids per radial" varde={indata.sPerR} onChange={set("sPerR")} steg="1" />
        <Tal id="g-kv" etikett="Driftspänning (kV)" varde={indata.kv} onChange={set("kv")} />
        <Tal id="g-lskid" etikett="Avstånd skid–skid (m)" varde={indata.lSkid} onChange={set("lSkid")} />
        <Tal id="g-lsv" etikett="Närmaste skid–ställverk (m)" varde={indata.lSV} onChange={set("lSV")} />
        <Val id="g-temp" etikett="Marktemperatur (°C)" varde={String(indata.marktemp)} alternativ={Object.keys(KF_TEMP)} onChange={(v) => set("marktemp")(Number(v))} />
        <Val id="g-rho" etikett="Värmeresistivitet (K·m/W)" varde={indata.rho} alternativ={Object.keys(KF_RHO)} onChange={set("rho")} />
        <Val id="g-djup" etikett="Förläggningsdjup (m)" varde={indata.djup} alternativ={Object.keys(KF_DJUP)} onChange={set("djup")} />
        <Val id="g-avst" etikett="Avstånd mellan radialer (mm)" varde={String(indata.avst)} alternativ={Object.keys(KF_GRP)} onChange={(v) => set("avst")(Number(v))} />
        <Val id="g-ror" etikett="MV i rör" varde={indata.ror} alternativ={["Nej", "Ja"]} onChange={set("ror")} />
        <Tal id="g-dcn" etikett="DC-kablar per container (+/−)" varde={indata.dcn} onChange={set("dcn")} steg="1" />
        <Tal id="g-dcl" etikett="DC-längd per kabel (m)" varde={indata.dcl} onChange={set("dcl")} />
        <Tal id="g-dcu" etikett="DC-systemspänning (V)" varde={indata.dcu} onChange={set("dcu")} />
        <Val id="g-dcj" etikett="DC-systemets jordning" varde={indata.dcjord} alternativ={["Ojordat (IT) med isolationsövervakning", "Mittpunktsjordat", "En pol jordad"]} onChange={set("dcjord")} />
        <Tal id="g-hk" etikett="Hjälpkraftlast (kW)" varde={indata.hkKw} onChange={set("hkKw")} />
        <Tal id="g-st" etikett="Stängsel (m)" varde={indata.stangsel} onChange={set("stangsel")} />
        <Tal id="g-v" etikett="Entreprenadtid (veckor)" varde={indata.veckor} onChange={set("veckor")} steg="1" />
      </div>
      <Callout ton="info">
        <b>MV-kabeln dimensioneras</b> med Prysmians belastningsförmåga för AXLJ-TTCL 24 kV × NKT Kraftkabelhandboken tabell 25–28 (temperatur, resistivitet, djup, anhopning) och ×0,8 i rör. Sträckan närmast ställverket räknas med alla radialer i samma schakt. Parallella system läggs om en kabel inte räcker. Ersätter inte slutlig beräkning enligt SS 424 14 16.
      </Callout>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={kor}>{harUnderlag ? "Generera om beredningen" : "Generera beredning"}</button>
        {harUnderlag ? <span className="self-center text-[13px] text-ink-soft">Ersätter skrivbordet. UE-priser och påslag ligger kvar.</span> : null}
      </div>
    </Card>
  );
}

function Skrivbord({ konst, andra }) {
  const [oppen, setOppen] = useState(null);
  return (
    <Card title="Skrivbord" subtitle={`${konst.length} konstruktioner. Öppna en rad för att ändra val; materiel, koder och kablar räknas om.`}>
      <TableRegion label="Konstruktioner">
        <table className="w-full">
          <thead>
            <tr>
              <th scope="col">Objekt</th>
              <th scope="col">Konstruktion</th>
              <th scope="col">Kontroll</th>
              <th scope="col" className={tal}>Artiklar</th>
              <th scope="col" className={tal}>Koder</th>
            </tr>
          </thead>
          <tbody>
            {konst.map((k, i) => {
              const r = kontrollera(k);
              const oppnad = oppen === i;
              return [
                <tr key={`r${i}`}>
                  <td data-label="Objekt">
                    <button type="button" className="btn sec" aria-expanded={oppnad} onClick={() => setOppen(oppnad ? null : i)}>{k.ident}</button>
                  </td>
                  <td data-label="Konstruktion">
                    {BIBLIOTEK[k.typ].namn}
                    {k.typ === "mv" ? <div className="text-[12px] text-ink-soft">{k.params.fran} → {k.params.till} · {k.params.sys > 1 ? `${k.params.sys} × ` : ""}{k.params.kabel} · {fmtTal(k.params.langd)} m · {fmtTal(k.params.mw)} MW</div> : null}
                  </td>
                  <td data-label="Kontroll">{r ? <span title={r.text}><Kontroll r={r} /></span> : <span className="text-ink-soft">–</span>}</td>
                  <td data-label="Artiklar" className={tal}>{k.m.length}</td>
                  <td data-label="Koder" className={tal}>{k.k.length}</td>
                </tr>,
                oppnad ? (
                  <tr key={`d${i}`}>
                    <td colSpan={5}>
                      <Detalj k={k} r={r} onAndra={(params) => andra(i, params)} />
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </TableRegion>
    </Card>
  );
}

function Detalj({ k, r, onAndra }) {
  const set = (f) => (v) => onAndra({ ...k.params, [f]: v });
  const p = k.params;
  return (
    <div className="flex flex-col gap-3 py-2">
      {r ? <Callout ton={ton(r) === "bad" ? "bad" : ton(r) === "warn" ? "warn" : "ok"}>{r.text}</Callout> : null}
      {k.typ === "mv" ? (
        <div className={rutnat}>
          <Val id={`d-kab-${k.ident}`} etikett="Kabeltyp" varde={p.kabel} alternativ={Object.keys(MVKABEL)} onChange={set("kabel")} />
          <Tal id={`d-sys-${k.ident}`} etikett="Parallella system" varde={p.sys} onChange={set("sys")} steg="1" />
          <Tal id={`d-l-${k.ident}`} etikett="Längd (m)" varde={p.langd} onChange={set("langd")} />
          <Tal id={`d-g-${k.ident}`} etikett="Kabelgrupper i schaktet" varde={p.grupper} onChange={set("grupper")} steg="1" />
          <Val id={`d-r-${k.ident}`} etikett="I rör" varde={p.ror} alternativ={["Nej", "Ja"]} onChange={set("ror")} />
        </div>
      ) : null}
      {k.typ === "batt" ? (
        <div className={rutnat}>
          <Tal id={`d-n-${k.ident}`} etikett="DC-kablar" varde={p.dcn} onChange={set("dcn")} steg="1" />
          <Tal id={`d-dl-${k.ident}`} etikett="DC-längd (m)" varde={p.dcl} onChange={set("dcl")} />
          <Val id={`d-dk-${k.ident}`} etikett="DC-kabel" varde={p.dckabel} alternativ={["AXQ 1x240 Al", "AXQ 1x300 Al"]} onChange={set("dckabel")} />
        </div>
      ) : null}
      {k.typ === "hk" ? (
        <div className={rutnat}>
          <Tal id={`d-hl-${k.ident}`} etikett="Längd matning (m)" varde={p.langd} onChange={set("langd")} />
          <Tal id={`d-hk-${k.ident}`} etikett="Last (kW)" varde={p.kw} onChange={set("kw")} />
        </div>
      ) : null}
      <p className="m-0 text-[12px] text-ink-soft">Koder: {k.k.map((x) => x.kod).join(", ")}</p>
    </div>
  );
}

function Kabellista({ konst, pnr, visaToast }) {
  const rader = kabellista(konst);
  const exportera = async () => {
    const r = await laddaNer(`${pnr}_Kabellista.csv`, "﻿" + kabellistaCsv(rader));
    if (r.txt) visaToast(r.txt, r.typ || "");
  };
  return (
    <Card
      title="Kabellista"
      subtitle="Nummerserier enligt Konstruktionshandbok EL 2.4.3. DC-serien 201–500 är förslag; handboken saknar serie för DC."
      action={<button type="button" className="btn sec" onClick={exportera}>Exportera CSV</button>}
    >
      <TableRegion label="Kabellista">
        <table className="w-full">
          <thead>
            <tr>
              <th scope="col">Kabel-ID</th><th scope="col">Från</th><th scope="col">Till</th><th scope="col">Typ</th>
              <th scope="col">Kabel</th><th scope="col" className={tal}>Antal</th><th scope="col" className={tal}>Längd m</th>
              <th scope="col" className={tal}>Totalt m</th><th scope="col">Förläggning</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(SERIER).flatMap((s) => {
              const rs = rader.filter((r) => r.serie === s);
              if (!rs.length) return [];
              return [
                <tr key={`h${s}`}><th scope="rowgroup" colSpan={9} className="text-left">{SERIER[s].namn} · {rs.length} st</th></tr>,
                ...rs.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Kabel-ID" className="font-bold">{r.id}</td>
                    <td data-label="Från">{r.fran}</td>
                    <td data-label="Till">{r.till}</td>
                    <td data-label="Typ">{r.typ}</td>
                    <td data-label="Kabel">{r.ben}<div className="text-[12px] text-ink-soft">{r.art}</div></td>
                    <td data-label="Antal" className={tal}>{r.antal}</td>
                    <td data-label="Längd m" className={tal}>{fmtTal(r.langd)}</td>
                    <td data-label="Totalt m" className={tal}>{fmtTal(r.totalt)}</td>
                    <td data-label="Förläggning" className="text-[12px]">{r.forl}</td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </TableRegion>
      <Callout ton="warn">
        <b>Kontrollera före beställning:</b> DC-kabelns märkning mot systemets jordning (0,6/1 kV tål 0,9 kV DC mot jord), kabelströmtransformatorns innerdiameter mot antal enledare, och böjradie 10×D (AXLJ-TTCL) vid genomföringar.
      </Callout>
    </Card>
  );
}

function Materiel({ konst }) {
  const lista = materiellista(konst);
  const ej = lista.filter((x) => !x.bl), bl = lista.filter((x) => x.bl);
  const saknas = ej.filter((x) => !x.pris).length;
  return (
    <Card
      title="Materiellista"
      subtitle={`${fmtSEK(ej.reduce((a, x) => a + x.n * x.pris, 0))} exkl. beställarlevererat. Priser härledda ur KLG 1:26, inte grossistnetto.`}
      badge={saknas ? <StatusBadge ton="warn" label={`${saknas} utan pris`} /> : null}
    >
      <TableRegion label="Materiellista">
        <table className="w-full">
          <thead>
            <tr><th scope="col">E-nr/Art</th><th scope="col">Benämning</th><th scope="col" className={tal}>Antal</th><th scope="col">Enh</th><th scope="col" className={tal}>À-pris</th><th scope="col" className={tal}>Summa</th><th scope="col">Priskälla</th></tr>
          </thead>
          <tbody>
            {[...ej, ...bl].map((x) => (
              <tr key={x.art}>
                <td data-label="E-nr/Art" className="whitespace-nowrap">{x.art}</td>
                <td data-label="Benämning">{x.ben}</td>
                <td data-label="Antal" className={tal}>{fmtTal(x.n, x.n % 1 ? 1 : 0)}</td>
                <td data-label="Enh">{x.enh}</td>
                <td data-label="À-pris" className={tal}>{x.bl ? "–" : x.pris ? fmtTal(x.pris, 2) : <StatusBadge ton="warn" label="Saknas" />}</td>
                <td data-label="Summa" className={tal}>{x.bl ? "BL" : fmtSEK(x.n * x.pris)}</td>
                <td data-label="Priskälla" className="text-[12px]">{x.kalla}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableRegion>
    </Card>
  );
}

function Kalkyl({ konst, inst, setInst }) {
  const k = beraknaKalkyl(konst, inst);
  const ue = [...new Set(k.uePrisSaknas)];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
        <StatTile label="Grundkalkyl" value={fmtKompakt(k.summa.summa)} hint={`${fmtTal(k.summa.hb + k.summa.hm)} mantimmar · ${fmtTal(k.summa.hx)} maskintimmar`} />
        <StatTile label={`Riskkalkyl +${fmtTal(inst.risk)} %`} value={fmtKompakt(k.riskkalkyl)} hint="Grund × risk" />
        <StatTile label={`Vinstkalkyl +${fmtTal(inst.vinst)} %`} value={fmtKompakt(k.vinstkalkyl)} hint="Anbudsunderlag exkl. moms" ton={ue.length ? "warn" : ""} badge={ue.length ? <StatusBadge ton="warn" label={`${ue.length} UE utan pris`} /> : null} />
      </div>
      <Card title="Förutsättningar" subtitle="Timpris enligt KLG 1:26: beredare 1 077, montör 982, maskin 1 190 kr/h.">
        <div className={rutnat}>
          <Tal id="k-f" etikett="Tidsfaktor" varde={inst.faktor} onChange={(v) => setInst({ ...inst, faktor: v })} />
          <Tal id="k-r" etikett="Risk %" varde={inst.risk} onChange={(v) => setInst({ ...inst, risk: v })} />
          <Tal id="k-v" etikett="Vinst %" varde={inst.vinst} onChange={(v) => setInst({ ...inst, vinst: v })} />
          <Val id="k-m" etikett="Materiel" varde={inst.materielKalla} alternativ={["beredning", "katalog"]} onChange={(v) => setInst({ ...inst, materielKalla: v })} />
        </div>
        {ue.length ? (
          <>
            <Callout ton="warn"><b>UE-poster utan pris.</b> Fyll i à-pris per enhet från offert. Kalkylen räknar 0 kr tills dess.</Callout>
            <div className={rutnat}>
              {ue.concat(Object.keys(inst.uePris || {}).filter((x) => !ue.includes(x))).map((kod) => {
                const rad = k.rader.find((r) => r.kod === kod);
                return rad ? (
                  <Tal key={kod} id={`ue-${kod}`} etikett={`${kod} ${rad.c.ben} (kr/${rad.c.enh})`} varde={inst.uePris?.[kod] ?? ""} onChange={(v) => setInst({ ...inst, uePris: { ...inst.uePris, [kod]: v } })} />
                ) : null;
              })}
            </div>
          </>
        ) : null}
      </Card>
      <Card title="Kalkylkoder" subtitle="KLG 1:26 P2 för schakt, kabel, fiber och jordning. BESS-schablon (B-koder) för det KLG saknar – kalibrera mot utfall.">
        <TableRegion label="Kalkylkoder">
          <table className="w-full">
            <thead>
              <tr><th scope="col">Kod</th><th scope="col">Benämning</th><th scope="col" className={tal}>Antal</th><th scope="col">Enh</th><th scope="col" className={tal}>Tim</th><th scope="col" className={tal}>Summa</th></tr>
            </thead>
            <tbody>
              {k.rader.map((r) => (
                <tr key={r.kod}>
                  <td data-label="Kod" className="whitespace-nowrap">{r.kod}</td>
                  <td data-label="Benämning">{r.c?.ben ?? "Saknas i katalogen"}</td>
                  <td data-label="Antal" className={tal}>{fmtTal(r.n, r.n % 1 ? 3 : 0)}</td>
                  <td data-label="Enh">{r.c?.enh}</td>
                  <td data-label="Tim" className={tal}>{r.v ? fmtTal(r.v.hb + r.v.hm, 1) : "–"}</td>
                  <td data-label="Summa" className={tal}>{r.v?.uePrisSaknas ? <StatusBadge ton="warn" label="UE-pris saknas" /> : fmtSEK(r.v?.summa)}</td>
                </tr>
              ))}
              {k.materielBeredning ? (
                <tr><td data-label="Kod">–</td><td data-label="Benämning">Materiel enligt materiellistan (exkl. BL)</td><td colSpan={3} /><td data-label="Summa" className={tal}>{fmtSEK(k.materielBeredning)}</td></tr>
              ) : null}
            </tbody>
          </table>
        </TableRegion>
      </Card>
    </div>
  );
}

const INST_STANDARD = { faktor: 1, risk: 5, vinst: 10, materielKalla: "beredning", uePris: {} };

export function Bered() {
  const { state } = usePortfolj();
  const { valtProjekt: pid, visaToast } = useUi();
  const [flik, setFlik] = useState("generator");
  const [underlag, spara] = useBered(pid);
  const p = state.projekt.find((x) => x.id === pid);

  const standardIndata = {
    ...GEN_STANDARD,
    ...(p?.mw ? { mw: p.mw } : {}),
    ...(p?.mwh ? { mwh: p.mwh } : {}),
    ...(profilFor(p).container.mwh ? { mwhC: profilFor(p).container.mwh } : {}),
  };
  const [utkast, setUtkast] = useState(null);
  if (!p) return null;

  const indata = utkast?.pid === pid ? utkast.data : underlag?.indata || standardIndata;
  const konst = underlag?.konstruktioner || [];
  const inst = { ...INST_STANDARD, ...(underlag?.inst || {}) };

  const lagra = (nytt) => {
    const fel = spara(nytt);
    if (fel) visaToast(fel, "bad");
  };

  const kor = () => {
    const rent = Object.fromEntries(Object.entries(indata).filter(([, v]) => v !== "" && v !== null));
    const g = genereraBess(rent);
    lagra({ ...(underlag || {}), indata: g.indata, antal: g.antal, konstruktioner: g.konstruktioner, inst });
    setUtkast(null);
    setFlik("skrivbord");
    visaToast(`${g.antal.container} containrar, ${g.antal.skid} MV-skids och ${g.antal.radialer} radialer genererade`);
  };

  const andra = (i, params) => {
    const k = konst[i];
    const ny = konst.slice();
    ny[i] = byggKonstruktion(k.typ, k.ident, params);
    lagra({ ...underlag, konstruktioner: ny });
  };

  const underkand = konst.map(kontrollera).filter((r) => r && r.ok === false).length;
  const verifiera = konst.map(kontrollera).filter((r) => r && r.ok === null).length;

  return (
    <div className="flex flex-col gap-4">
      <Projektvaljare />
      {konst.length ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
          <StatTile label="Battericontainrar" value={fmtTal(underlag.antal?.container)} hint={`${fmtTal(underlag.indata?.mwh)} MWh`} />
          <StatTile label="MV-skids" value={fmtTal(underlag.antal?.skid)} hint={`${fmtTal(underlag.indata?.mw)} MW · ${fmtTal(underlag.antal?.radialer)} radialer`} />
          <StatTile label="Kablar" value={fmtTal(kabellista(konst).length)} hint="i kabellistan" />
          <StatTile
            label="Kontroller"
            value={underkand ? `${underkand} underkända` : verifiera ? `${verifiera} att verifiera` : "Alla OK"}
            ton={underkand ? "bad" : verifiera ? "warn" : "ok"}
            hint="MV-last, DC-spänning, spänningsfall"
          />
        </div>
      ) : null}
      <div role="tablist" aria-label="ONE Bered" className="flex flex-wrap gap-2">
        {FLIKAR.map(([id, namn]) => (
          <button key={id} type="button" role="tab" aria-selected={flik === id} className={`btn ${flik === id ? "" : "sec"}`.trim()} onClick={() => setFlik(id)} disabled={id !== "generator" && !konst.length}>
            {namn}
          </button>
        ))}
      </div>
      {flik === "generator" || !konst.length ? (
        <Generator p={p} indata={indata} setIndata={(d) => setUtkast({ pid, data: d })} kor={kor} harUnderlag={!!konst.length} />
      ) : null}
      {flik === "skrivbord" && konst.length ? <Skrivbord konst={konst} andra={andra} /> : null}
      {flik === "kabel" && konst.length ? <Kabellista konst={konst} pnr={p.nr || p.id} visaToast={visaToast} /> : null}
      {flik === "materiel" && konst.length ? <Materiel konst={konst} /> : null}
      {flik === "kalkyl" && konst.length ? <Kalkyl konst={konst} inst={inst} setInst={(v) => lagra({ ...underlag, inst: v })} /> : null}
      <Callout ton="info">
        <b>Underlagets status.</b> E-nr ur Prysmian och Nexans. BESS-timmar är schablon att kalibrera mot 36037/36038. Beredningen sparas i den här webbläsaren per projekt; ÄTA, tid och faktura sköts i sina egna vyer.
      </Callout>
    </div>
  );
}
