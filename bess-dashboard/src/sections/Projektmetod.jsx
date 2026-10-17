import { useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { ArrowRight, CalendarDays, ClipboardCheck, ClipboardList, FileCheck2, FileText, HardHat, ListTodo, ShieldCheck, SlidersHorizontal, TriangleAlert, Users, Wallet } from "lucide-react";
import { Card, Meter, StatusBadge } from "../components/ds/index.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { NyttProjekt } from "../components/ui/NyttProjekt.jsx";
import { METODSTEG, ORDLISTA } from "../data/projektmetod.js";
import { VYMETA } from "../data/vyer.js";
import { faslage } from "../lib/epc.js";
import { metodStegLage } from "../lib/metodlage.js";
import { statusEtikett } from "../data/projektfaser.ts";

const STEGIKONER = [ClipboardList, CalendarDays, HardHat, ShieldCheck, ClipboardCheck, FileCheck2];
const VYIKONER = { idag: CalendarDays, punkter: ListTodo, dagbok: FileText, vecka: ClipboardCheck, tidplan: CalendarDays, budget: Wallet, moten: Users, risker: TriangleAlert, storning: TriangleAlert };

export function Projektmetod() {
  const { state } = usePortfolj();
  const { valtProjekt, setValtProjekt, visa, oppnaPost, oppnaFlagga, oppnaFaltmaterial } = useUi();
  const [ord, setOrd] = useState("");
  const p = state.projekt.find((r) => r.id === valtProjekt) || state.projekt[0];
  const faser = p ? faslage(state, p.id) : [];
  const saknas = p ? [[p.nr, "projektnummer"], [p.bestallare, "beställare"], [p.startdatum, "startdatum"], [p.fardigstallande, "färdigdatum"], [p.kontraktsvarde !== null && p.kontraktsvarde !== undefined, "kontraktssumma"]].filter(([v]) => !v).map(([, n]) => n) : [];
  const total = metodStegLage(faser);
  const knapp = (vy) => { const Ikon = VYIKONER[vy]; return <button type="button" className="btn sec mini metod-verktyg" key={vy} onClick={() => visa(vy)}>{Ikon ? <Ikon size={15} aria-hidden="true" /> : null}{VYMETA[vy].namn}</button>; };
  return <div className="projektmetod flex flex-col gap-6 lg:gap-8">
    <Card className="metod-intro" icon={ClipboardList} id="metod-start" title="En arbetsmetod för varje projekt" subtitle="Välj projekt. Gör nästa uppgift. Spara vad som faktiskt blev gjort." action={<NyttProjekt />}>
      <Projektvaljare />
      <p className="m-0 text-sm">Metoden passar nyckelfärdiga batteriparker. I andra projekt kan du använda planering, ekonomi, möten och uppföljning. Anpassa tekniska steg, priser och dokumentkrav till uppdraget.</p>
      {p ? <div className="metod-projekt">
        <div className="metod-projekt-identitet"><span className="metod-overline">AKTIVT PROJEKT</span><b>Du arbetar med {p.nr ? `${p.nr} · ` : ""}{p.namn}.</b><StatusBadge label={statusEtikett(p.status)} ton="info" /></div>
        <div className="metod-projekt-framdrift"><div className="metod-matar-rad"><span>Fasgrindar</span><b>{total.passerade} / {total.totalt}</b></div><Meter value={total.passerade} max={total.totalt} label="Projektets passerade fasgrindar" /><small>Enligt byggöversikten. Provresultat granskas separat.</small></div>
        <div className="metod-projekt-under"><p className="m-0 text-sm">{saknas.length ? `Grunduppgifter att komplettera: ${saknas.join(", ")}.` : "De viktigaste grunduppgifterna finns. Kontrollera att de fortfarande stämmer."}</p><button type="button" className="btn sec mini metod-verktyg" onClick={() => oppnaFlagga(p.id, "oversikt", "projektdata")}><SlidersHorizontal size={15} aria-hidden="true" />Redigera projektets uppgifter</button></div>
      </div> : <p>Skapa ett projekt för att börja.</p>}
    </Card>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card id="metod-dag" icon={CalendarDays} title="Varje dag – börja här" subtitle="Ta det som är bråttom först.">
        <ol className="m-0 space-y-2 pl-5 text-sm"><li>Öppna Idag. Ta försenade datum och svar som snart måste lämnas.</li><li>Ge varje uppgift en ansvarig och ett sista datum.</li><li>Anteckna utfört arbete. Dokumentera ändringar och hinder direkt.</li></ol>
        <div className="flex flex-wrap gap-2">{["idag", "punkter", "dagbok"].map(knapp)}</div>
      </Card>
      <Card id="metod-vecka" icon={ClipboardCheck} title="Varje vecka – stäm av" subtitle="Avsätt en fast tid för varje projekt.">
        <ol className="m-0 space-y-2 pl-5 text-sm"><li>Gör Veckokoll och följ upp gamla beslut.</li><li>Jämför tidplan, bemanning, budget och verklig kostnad.</li><li>Ta upp risker, ÄTA, öppna fel och dokumentation på byggmötet.</li></ol>
        <div className="flex flex-wrap gap-2">{["vecka", "tidplan", "budget", "moten"].map(knapp)}</div>
      </Card>
    </div>
    <section aria-labelledby="metod-steg"><div className="metod-sektionshuvud"><span className="metod-overline">FRÅN UPPDRAG TILL ÖVERLÄMNING</span><h2 id="metod-steg">Hela projektet i sex steg</h2><p>Öppna verktyget du behöver och följ projektets fasgrindar.</p></div>
      <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">{METODSTEG.map((steg, i) => {
        const relevanta = faser.filter((f) => steg.faser.includes(f.fas.nr));
        const lage = metodStegLage(relevanta);
        return <li key={steg.namn}><Card className="metod-stegkort" icon={STEGIKONER[i]} title={steg.namn} badge={p ? <StatusBadge ton={lage.ton} label={lage.text} /> : null}>
          <p className="m-0 text-sm">{steg.text}</p>
          <p className="m-0 text-sm text-ink-soft"><b>Spara som bevis:</b> {steg.bevis}.</p>
          {p ? <div className="metod-steg-framdrift"><div className="metod-matar-rad"><span>Fasgrindar passerade</span><b>{lage.passerade} / {lage.totalt}<span className="metod-procent">{lage.procent} %</span></b></div><Meter value={lage.passerade} max={lage.totalt} label={`Fasgrindar för ${steg.namn}`} /><p className="m-0 mt-2 text-xs text-ink-soft">Enligt byggöversikten. Provresultat granskas separat.</p></div> : null}
          <div className="flex flex-wrap gap-2">{steg.vyer.map(knapp)}{p ? <button type="button" className="btn sec mini metod-byggknapp" onClick={() => { setValtProjekt(p.id); oppnaPost("epc", `fas-${steg.faser[0]}`); }}>Visa stegets byggmoment<ArrowRight size={15} aria-hidden="true" /></button> : null}</div>
        </Card></li>;
      })}</ol>
    </section>
    <Card id="metod-kontroll" icon={ShieldCheck} title="En bock, ett prov och ett klartecken är olika saker">
      <dl className="m-0 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="font-bold">Byggchecklistan</dt><dd className="m-0 mt-1">Visar arbetsläget och fasgrindar. En punkt kan vara klar genom en passerad grind.</dd></div><div><dt className="font-bold">Egenkontrollen</dt><dd className="m-0 mt-1">Sparar verkligt resultat, datum, kontrollant och bevis per projekt och kontrollomfattning.</dd></div><div><dt className="font-bold">Överlämningen</dt><dd className="m-0 mt-1">Kräver granskade handlingar, hanterade fel och dokumenterat mottagande enligt kontraktet.</dd></div></dl>
      <p className="m-0 text-sm text-ink-soft">Byggöversikten kan också härleda en passerad grind från fakturerad betalning eller en senare grind. Det fyller aldrig i ett tekniskt provresultat.</p>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn" disabled={!p} onClick={() => { setValtProjekt(p.id); oppnaFaltmaterial({ mallpaket: "projekt" }); }}>Egenkontroller och fältmaterial</button>{knapp("slutdok")}</div>
    </Card>
    <Card id="metod-handelser" icon={ListTodo} title="Var skriver jag det som händer?">
      <div className="grid gap-3 text-sm sm:grid-cols-2">{[
        ["punkter", "Något behöver göras", "Skriv en uppgift med ansvarig och datum."],
        ["risker", "Något kan gå fel", "Skriv en risk och bestäm en förebyggande åtgärd."],
        ["ata", "Arbetets omfattning ändras", "Skapa ÄTA-ärende och spara underrättelse eller beställning."],
        ["storning", "Planerat arbete stoppas", "Dokumentera hindret, påverkan och underrättelsen."],
      ].map(([vy, t, beskrivning]) => <div key={vy} className="rounded-sm bg-sunken p-3"><b>{t}</b><p className="my-2">{beskrivning}</p>{knapp(vy)}</div>)}</div>
      <p className="m-0 text-sm text-ink-soft">Samma händelse kan behöva både dagboksbevis och ett ÄTA-/hinderärende. Spara referenser mellan underlagen.</p>
    </Card>
    <Card id="metod-anpassa" icon={SlidersHorizontal} title="Kontrollera detta i varje nytt projekt">
      <ul className="m-0 space-y-2 pl-5 text-sm"><li>Vad ingår i kontraktet, och vem ansvarar för varje del?</li><li>Stämmer tidplan, betalningssteg, priser, frister och dokumentkrav?</li><li>Vilka tillverkare och modeller används? Vilka manualrevisioner gäller?</li><li>Vilka kontroller behöver varje enhet? Vilka prov ska beställaren bevittna?</li><li>Var lagras originalhandlingar, foton och protokoll? Kontrollera synkstatus och ta backup.</li></ul>
      <p className="m-0 text-sm text-ink-soft">BESS- och kontraktsmallarna bygger delvis på Batch C. De är en utgångspunkt. Namn som SharePoint, IFS och ENIA i instruktionerna betyder inte att sidan automatiskt skriver till dessa system.</p>
      <div className="flex flex-wrap gap-2">{knapp("kontrakt")}{knapp("data")}</div>
    </Card>
    <Card id="metod-ord" title="Ordlista – svåra ord på vanlig svenska">
      <label className="flex flex-col gap-1 text-sm">Sök i ordlistan<input type="search" value={ord} onChange={(e) => setOrd(e.target.value)} placeholder="Till exempel ÄTA, grind eller PCS" /></label>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">{ORDLISTA.filter(([n, t]) => `${n} ${t}`.toLocaleLowerCase("sv").includes(ord.toLocaleLowerCase("sv").trim())).map(([n, t]) => <div key={n} className="rounded-sm bg-sunken p-3 text-sm"><dt className="font-bold">{n}</dt><dd className="m-0 mt-1">{t}</dd></div>)}</dl>
    </Card>
  </div>;
}

