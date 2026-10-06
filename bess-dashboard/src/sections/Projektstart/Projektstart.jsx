import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, CheckList, Meter, Overline, StatusBadge } from "../../components/ds/index.js";
import { PdfExporter } from "../../components/print/PdfExporter.jsx";
import { laddaNerPdf } from "../../components/print/laddaNerPdf.jsx";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { idag } from "../../lib/datum.js";
import { Kraftkurva } from "../../components/oversikt/Hero.jsx";
import { KATALOG_RUBRIK, STEG } from "../../data/projektstartSteg.js";
import {
  SISTA_STEG,
  UTKAST_NYCKEL,
  arAvbockad,
  lasUtkast,
  luckor,
  nyTabellrad,
  projektFranUtkast,
  kortAndringar,
  projektstartDokument,
  projektstartPost,
  utkastAndrat,
  utkastFranProjekt,
  utkastFranPost,
  projektstartFel,
  stegPunkter,
  tomtUtkast,
} from "../../lib/projektstart.js";

/* Fliken Projektstart — ONE-P-guiden i fjorton steg. Utkastet bor i webbläsaren
   tills man trycker Skapa projekt på sista steget. Då skapas projektet med de
   riskrader och milstolpar man skrev in. Ekonomivärden (kontraktssumma,
   betalplan) skrivs inte in här, de sätts i den vanliga ekonomiflödet. */

function laddaUtkast() {
  try {
    return lasUtkast(window.localStorage.getItem(UTKAST_NYCKEL));
  } catch {
    return tomtUtkast();
  }
}

function Faltruta({ f, varde, onChange }) {
  const id = `ps-${f.id}`;
  const bred = f.bred ? "md:col-span-2" : "";
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${bred}`}>
      <label htmlFor={id}>
        <Overline as="span">{f.etikett}</Overline>
      </label>
      {f.typ === "textarea" ? (
        <textarea id={id} rows={3} value={varde} onChange={(e) => onChange(e.target.value)} />
      ) : f.typ === "select" ? (
        <select id={id} value={varde} onChange={(e) => onChange(e.target.value)}>
          {["beslut", "niva", "offra"].includes(f.id) ? <option value="">Välj …</option> : null}
          {f.alternativ.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} type={f.typ} value={varde} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.tips ? <span className="text-xs text-ink-soft">{f.tips}</span> : null}
    </div>
  );
}

function Tabell({ tabell, rader, onChange }) {
  const uppdatera = (rid, kol, v) => onChange(rader.map((r) => (r.id === rid ? { ...r, [kol]: v } : r)));
  return (
    <Card id={`ps-tabell-${tabell.id}`} title={tabell.titel} action={<button type="button" className="btn sec mini" onClick={() => onChange([...rader, nyTabellrad(tabell)])}><Plus size={14} aria-hidden="true" /> Lägg till rad</button>}>
      {tabell.anmarkning ? <p className="m-0 text-[12.5px] text-ink-soft">{tabell.anmarkning}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr>
              {tabell.kolumner.map((k) => (
                <th key={k.id} scope="col" className="px-1 pb-1 text-left"><Overline as="span">{k.etikett}</Overline></th>
              ))}
              <th scope="col" className="w-10"><span className="sr-only">Ta bort</span></th>
            </tr>
          </thead>
          <tbody>
            {rader.map((r, i) => (
              <tr key={r.id}>
                {tabell.kolumner.map((k) => {
                  const namn = `${tabell.titel}, rad ${i + 1}: ${k.etikett}`;
                  return (
                    <td key={k.id} className={`p-1 align-top ${k.bredd === "wide" ? "min-w-[220px]" : "min-w-[110px]"}`}>
                      {k.typ === "select" ? (
                        <select aria-label={namn} value={r[k.id]} onChange={(e) => uppdatera(r.id, k.id, e.target.value)}>
                          {k.alternativ.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      ) : (
                        <input aria-label={namn} type={k.typ} value={r[k.id]} onChange={(e) => uppdatera(r.id, k.id, e.target.value)} />
                      )}
                    </td>
                  );
                })}
                <td className="p-1 align-top">
                  <button type="button" className="btn sec mini" aria-label={`Ta bort rad ${i + 1} i ${tabell.titel}`} onClick={() => onChange(rader.filter((x) => x.id !== r.id))}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Kontrollpunkter({ steg, utkast, onToggle }) {
  const grupper = (steg.katalog || []).flatMap((bucket) => {
    const punkter = stegPunkter({ katalog: [bucket] });
    const namn = [...new Set(punkter.map((p) => p.grupp))];
    return namn.map((g) => ({ rubrik: steg.katalog.length > 1 ? `${KATALOG_RUBRIK[bucket]}: ${g}` : g, bucket, punkter: punkter.filter((p) => p.grupp === g) }));
  });
  return (
    <div className="flex flex-col gap-4">
      {grupper.map((g) => {
        const klara = g.punkter.filter((p) => arAvbockad(utkast, p)).length;
        return (
          <Card key={g.rubrik} id={`ps-kp-${g.bucket}-${g.rubrik}`} title={g.rubrik} badge={<span className="text-xs text-ink-soft tabular-nums">{klara} av {g.punkter.length}</span>}>
            <CheckList
              label={g.rubrik}
              items={g.punkter.map((p) => ({ id: p.id, label: p.kritisk ? `${p.text} (kritisk)` : p.text, hint: p.tips, checked: arAvbockad(utkast, p) }))}
              onChange={(pid, v) => onToggle(g.bucket, pid, v)}
            />
          </Card>
        );
      })}
    </div>
  );
}

function Sammanfattning({ utkast, fel, kanSkapa, skapar, redigerar, andrat, ejSparad, onSkapa, onSpara, onGaTill }) {
  const l = luckor(utkast);
  const v = utkast.v;
  const risker = (utkast.rader.risker || []).filter((r) => r.titel?.trim()).length;
  const milstolpar = (utkast.rader.milstolpar || []).filter((m) => m.namn?.trim() && m.datum).length;
  const rader = [
    ["Projekt", `${v.nr ? v.nr + " " : ""}${v.namn || "Namn saknas"}`],
    ["Beställare", v.bestallare || "—"],
    ["Plats", v.plats || "—"],
    ["Start", v.startdatum || "—"],
    ["Färdig", v.fardigdatum || "—"],
    ["Kontraktsform", v.kontraktsform || "—"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <Card id="ps-sammanfattning" title={redigerar ? "Sparad projektstart" : "Det här skapas"}>
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {rader.map(([k, val]) => (
            <div key={k} className="min-w-0">
              <dt><Overline as="span">{k}</Overline></dt>
              <dd className="m-0 mt-1 truncate border-0 border-b border-solid border-hairline pb-1 text-[14px] text-ink">{val}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 text-[13.5px] text-ink">
          {redigerar
            ? "Ändringarna sparas i projektstarten och projektkortet. Risker och milstolpar som redan finns i projektet ändras inte här."
            : `Projektet skapas med ${risker} riskrader och ${milstolpar} milstolpar. Mallarna för handlingsplan, APD och slutdokumentation kommer med automatiskt.`}
        </p>
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span>Kontrollpunkter avbockade</span>
            <span className="tabular-nums text-ink-soft">{l.klara} av {l.totalt}</span>
          </div>
          <Meter value={l.klara} max={l.totalt} label="Avbockade kontrollpunkter" />
        </div>
      </Card>

      {!redigerar && l.stegKvar.length ? (
        <Callout ton="warn">
          <b>{l.stegKvar.length} steg är inte genomgångna</b>
          <div className="mt-2 flex flex-wrap gap-2">
            {l.stegKvar.map((s) => (
              <button key={s.id} type="button" className="btn sec mini" onClick={() => onGaTill(s.id)}>{s.titel}</button>
            ))}
          </div>
        </Callout>
      ) : null}

      {l.kritiskaOppna.length ? (
        <Callout ton="info">
          <b>{l.kritiskaOppna.length} av {l.kritiskaTotalt} kritiska punkter är inte bockade</b>
          Det stoppar inte skapandet. Punkterna ligger kvar i den här guiden tills du skapar projektet.
        </Callout>
      ) : null}

      {fel ? <Callout ton="bad"><b>Projektet kan inte skapas ännu</b>{fel}</Callout> : null}

      <div className="flex flex-wrap items-center gap-3">
        {redigerar ? (
          <button type="button" className="btn" disabled={!kanSkapa || (!andrat && !ejSparad)} onClick={onSpara}>{ejSparad ? "Spara projektstart" : "Spara ändringar"}</button>
        ) : (
          <button type="button" className="btn" disabled={!kanSkapa || skapar} aria-busy={skapar} onClick={onSkapa}>{skapar ? "Skapar …" : "Skapa projekt"}</button>
        )}
        <PdfExporter
          dokument={projektstartDokument(utkast, { datum: idag(), skapadAv: hamtaNamn() || "" })}
          typ="projektstart"
          label="Ladda ned PDF"
          className="btn sec"
          disabled={!v.namn?.trim()}
        />
      </div>
      <p className="m-0 text-[12.5px] text-ink-soft">{redigerar ? "PDF:en innehåller det som står i guiden just nu, även osparade ändringar." : "PDF:en laddas ned automatiskt när du skapar projektet. Du kan också ladda ned den separat här."}</p>
    </div>
  );
}

export function Projektstart() {
  const { state, dispatch, laggTill, sattLista, uppd } = usePortfolj();
  const { visa, visaToast, setValtProjekt, bekrafta } = useUi();
  const [utkast, setUtkast] = useState(laddaUtkast);
  const [skapar, setSkapar] = useState(false);
  /* "ny" är den pågående nya projektstarten (utkast i webbläsaren). Ett projekt-id
     öppnar den sparade projektstarten för det projektet, för ändringar och ny PDF. */
  const [lage, setLage] = useState("ny");
  const redigerar = lage !== "ny";
  const sparadeFor = (pid) => (state.projektstart || []).find((x) => x.projektId === pid);
  const post = redigerar ? sparadeFor(lage) : null;
  const projektet = redigerar ? state.projekt.find((p) => p.id === lage) : null;
  /* Det som senast sparades (eller första ifyllningen), för Ångra och för att se om något ändrats. */
  const [grund, setGrund] = useState(null);
  const andrat = !!grund && utkastAndrat(utkast, grund);

  useEffect(() => {
    if (redigerar) return;
    try {
      window.localStorage.setItem(UTKAST_NYCKEL, JSON.stringify(utkast));
    } catch {
      /* Utkastet fungerar även utan lagring, men sparas då inte mellan besök. */
    }
  }, [utkast, redigerar]);

  const index = Math.max(0, STEG.findIndex((s) => s.id === utkast.steg));
  const steg = STEG[index];
  const sista = steg.id === SISTA_STEG;

  const forhandsrad = useMemo(() => projektFranUtkast(utkast, "forhandsgranskning").projekt, [utkast]);
  const utanDetta = redigerar ? { ...state, projekt: state.projekt.filter((p) => p.id !== lage) } : state;
  const fel = sista ? projektstartFel(utanDetta, forhandsrad) || (!redigerar && luckor(utkast).stegKvar.length ? "Gå igenom alla steg först." : "") : "";

  const sattFalt = (id, v) => setUtkast((u) => ({ ...u, v: { ...u.v, [id]: v } }));
  const sattRader = (id, rader) => setUtkast((u) => ({ ...u, rader: { ...u.rader, [id]: rader } }));
  const kryssa = (bucket, pid, v) => setUtkast((u) => ({ ...u, kryss: { ...u.kryss, [bucket]: { ...u.kryss[bucket], [pid]: v } } }));
  const gaTill = (id) => setUtkast((u) => ({ ...u, steg: id, besokta: u.besokta.includes(u.steg) ? u.besokta : [...u.besokta, u.steg] }));

  const bytLage = async (nytt) => {
    if (nytt === lage) return;
    if (andrat && !(await bekrafta("Dina ändringar i den sparade projektstarten är inte sparade och försvinner.", { titel: "Osparade ändringar", ok: "Byt ändå", fara: true }))) return;
    const valt = nytt === "ny" ? null : state.projekt.find((p) => p.id === nytt);
    const sparad = valt ? sparadeFor(valt.id) : null;
    const oppnat = !valt ? laddaUtkast() : sparad ? utkastFranPost(sparad) : utkastFranProjekt(valt, state);
    setLage(nytt);
    setUtkast(oppnat);
    setGrund(valt ? oppnat : null);
  };

  const sparaAndringar = () => {
    if (!projektet) return;
    const f = projektstartFel(utanDetta, forhandsrad);
    if (f) {
      visaToast(f, "warn");
      return;
    }
    const nu = new Date().toISOString();
    if (post) sattLista("projektstart", state.projektstart.map((x) => (x.id === post.id ? { ...x, utkast: { v: utkast.v, rader: utkast.rader, kryss: utkast.kryss }, uppdaterad: nu } : x)));
    else laggTill("projektstart", projektstartPost(projektet.id, utkast, nu));
    setGrund(utkast);
    for (const [falt, varde] of kortAndringar(utkast, projektet)) uppd("projekt", projektet.id, falt, varde);
    visaToast("Projektstarten är sparad. Projektkortet är uppdaterat. Risker och milstolpar ändrar du på sina egna sidor.");
  };

  const angra = () => grund && setUtkast({ ...grund, steg: utkast.steg });

  const borjaOm = async () => {
    const ja = await bekrafta("Allt du skrivit i guiden tas bort. Projekt som redan är skapade påverkas inte.", { titel: "Börja om", ok: "Börja om", fara: true });
    if (ja) setUtkast(tomtUtkast());
  };

  const skapa = async () => {
    const id = `projekt-${crypto.randomUUID()}`;
    const { projekt, risker, milstolpar } = projektFranUtkast(utkast, id);
    const f = projektstartFel(state, projekt);
    if (f) {
      visaToast(f, "warn");
      return;
    }
    setSkapar(true);
    // PDF-underlaget byggs innan utkastet töms. Projektet skapas först, så att ett
    // PDF-fel aldrig hindrar det.
    const pdfUnderlag = projektstartDokument(utkast, { datum: idag(), skapadAv: hamtaNamn() || "" });
    dispatch({ type: "SKAPA_PROJEKT", rad: projekt });
    for (const r of risker) laggTill("risker", r);
    for (const m of milstolpar) laggTill("milstolpar", m);
    laggTill("projektstart", projektstartPost(id, utkast));
    const pdfKlar = await laddaNerPdf(pdfUnderlag, "projektstart", visaToast);
    try {
      window.localStorage.removeItem(UTKAST_NYCKEL);
    } catch {
      /* Inget att städa om lagringen är avstängd. */
    }
    setUtkast(tomtUtkast());
    setValtProjekt(id);
    visa("metod");
    setSkapar(false);
    visaToast(`Projektet är skapat${pdfKlar ? " och PDF:en är nedladdad" : ", men PDF:en kunde inte skapas"}. Kontrollera kontrakt, betalplan, priser och kontrollkrav före användning.`);
  };

  const stegStatus = (s) => {
    const p = stegPunkter(s);
    if (p.length) return `${p.filter((x) => arAvbockad(utkast, x)).length}/${p.length}`;
    return utkast.besokta.includes(s.id) ? "klar" : "";
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <section aria-label="Projektstart" className="relative overflow-hidden rounded-xl bg-one-djup px-4 py-5 text-white md:min-h-[210px] md:px-6 md:py-6">
        <Kraftkurva />
        <div className="relative flex max-w-[34rem] flex-col gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">ONE-P · {redigerar ? `${projektet?.nr || ""} ${projektet?.namn || ""} · ` : ""}Steg {index + 1} av {STEG.length}</span>
          <h2 className="m-0 font-head text-[22px] leading-tight text-white">{steg.titel}</h2>
          <Meter value={index + 1} max={STEG.length} label="Steg i guiden" ton="pagar" />
          <span className="text-[12px] opacity-80">one-nordic.se</span>
        </div>
      </section>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
      <nav aria-label="Stegen i projektstarten" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
        {state.projekt.length ? (
          <label className="flex flex-col gap-1">
            <Overline as="span">Arbeta med</Overline>
            <select value={lage} onChange={(e) => bytLage(e.target.value)} aria-label="Arbeta med">
              <option value="ny">Ny projektstart</option>
              {state.projekt.map((pr) => (
                <option key={pr.id} value={pr.id}>{pr.nr ? `${pr.nr} ` : ""}{pr.namn}{sparadeFor(pr.id) ? "" : " (ej sparad start)"}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1 lg:hidden">
          <Overline as="span">Steg {index + 1} av {STEG.length}</Overline>
          <select value={steg.id} onChange={(e) => gaTill(e.target.value)} aria-label="Välj steg">
            {STEG.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.titel}</option>)}
          </select>
        </label>
        <ol className="m-0 hidden list-none flex-col gap-0.5 p-0 lg:flex">
          {STEG.map((s, i) => {
            const ny = STEG[i - 1]?.fas !== s.fas;
            const aktiv = s.id === steg.id;
            return (
              <li key={s.id} className="flex flex-col">
                {ny ? <span className="px-2 pb-1 pt-3 first:pt-0"><Overline as="span">{s.fas}</Overline></span> : null}
                <button
                  type="button"
                  aria-current={aktiv ? "step" : undefined}
                  onClick={() => gaTill(s.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border-0 px-2 py-2 text-left text-[13px] ${aktiv ? "bg-one-djup text-white" : "bg-transparent text-ink hover:bg-sunken"}`}
                >
                  <span className="w-5 shrink-0 text-right tabular-nums opacity-70">{i + 1}</span>
                  <span className="min-w-0 flex-1">{s.titel}</span>
                  <span className="text-[11px] tabular-nums opacity-70">{stegStatus(s)}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {redigerar ? (
          <button type="button" className="btn sec mini self-start" disabled={!andrat} onClick={angra}>Ångra ändringar</button>
        ) : (
          <button type="button" className="btn sec mini self-start" onClick={borjaOm}>Börja om</button>
        )}
      </nav>

      <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
        {redigerar && !post ? (
          <Callout ton="info">
            <b>Projektet har ingen sparad projektstart</b>
            Guiden är ifylld från projektkortet, riskregistret och milstolparna. Checklistor och direktiv är tomma. Gå igenom stegen och tryck Spara projektstart på sista steget.
          </Callout>
        ) : null}
        <Card
          id="ps-steg"
          title={`${index + 1}. ${steg.titel}`}
          subtitle={steg.sammanfattning}
          badge={<StatusBadge label={steg.fas} ton="neutral" />}
        >
          {steg.grund ? (
            <Callout ton="info">
              <b>Tre grundsanningar</b>
              {steg.grund.map((g) => <span key={g} className="block">{g}</span>)}
            </Callout>
          ) : null}
          {steg.falt ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {steg.falt.map((f) => <Faltruta key={f.id} f={f} varde={utkast.v[f.id] ?? ""} onChange={(v) => sattFalt(f.id, v)} />)}
            </div>
          ) : null}
        </Card>

        {steg.tabell ? <Tabell tabell={steg.tabell} rader={utkast.rader[steg.tabell.id] || []} onChange={(r) => sattRader(steg.tabell.id, r)} /> : null}
        {steg.katalog ? <Kontrollpunkter steg={steg} utkast={utkast} onToggle={kryssa} /> : null}
        {sista ? <Sammanfattning utkast={utkast} fel={fel} kanSkapa={!fel} skapar={skapar} redigerar={redigerar} andrat={andrat} ejSparad={redigerar && !post} onSkapa={skapa} onSpara={sparaAndringar} onGaTill={gaTill} /> : null}

        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn sec" disabled={index === 0} onClick={() => gaTill(STEG[index - 1].id)}>
            <ChevronLeft size={16} aria-hidden="true" /> Föregående
          </button>
          <span className="text-[12px] tabular-nums text-ink-soft">{index + 1} / {STEG.length}</span>
          {sista ? <span /> : (
            <button type="button" className="btn" onClick={() => gaTill(STEG[index + 1].id)}>
              Nästa <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
