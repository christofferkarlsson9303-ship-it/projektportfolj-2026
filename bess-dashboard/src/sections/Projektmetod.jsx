import { useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Card } from "../components/ds/index.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { NyttProjekt } from "../components/ui/NyttProjekt.jsx";
import { METODSTEG, ORDLISTA } from "../data/projektmetod.js";
import { VYMETA } from "../data/vyer.js";
import { faslage } from "../lib/epc.js";

export function Projektmetod() {
  const { state } = usePortfolj();
  const { valtProjekt, setValtProjekt, visa, oppnaPost, oppnaFlagga, oppnaFaltmaterial } = useUi();
  const [ord, setOrd] = useState("");
  const p = state.projekt.find((r) => r.id === valtProjekt) || state.projekt[0];
  const faser = p ? faslage(state, p.id) : [];
  const saknas = p ? [[p.nr, "projektnummer"], [p.bestallare, "beställare"], [p.startdatum, "startdatum"], [p.fardigstallande, "färdigdatum"], [p.kontraktsvarde !== null && p.kontraktsvarde !== undefined, "kontraktssumma"]].filter(([v]) => !v).map(([, n]) => n) : [];
  const knapp = (vy) => <button type="button" className="btn sec mini" key={vy} onClick={() => visa(vy)}>{VYMETA[vy].namn}</button>;
  return <div className="flex flex-col gap-4 lg:gap-6">
    <Card id="metod-start" title="En arbetsmetod för varje projekt" subtitle="Välj projekt. Gör nästa uppgift. Spara vad som faktiskt blev gjort." action={<NyttProjekt />}>
      <Projektvaljare />
      <p className="m-0 text-sm">Metoden passar nyckelfärdiga batteriparker. I andra projekt kan du använda planering, ekonomi, möten och uppföljning. Anpassa tekniska steg, priser och dokumentkrav till uppdraget.</p>
      {p ? <div className="rounded-sm bg-sunken p-3 text-sm"><b>Du arbetar med {p.nr ? `${p.nr} · ` : ""}{p.namn}.</b><p className="my-2">{saknas.length ? `Grunduppgifter att komplettera: ${saknas.join(", ")}.` : "De viktigaste grunduppgifterna finns. Kontrollera att de fortfarande stämmer."}</p><button type="button" className="btn sec mini" onClick={() => oppnaFlagga(p.id, "oversikt", "projektdata")}>Redigera projektets uppgifter</button></div> : <p>Skapa ett projekt för att börja.</p>}
    </Card>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card id="metod-dag" title="Varje dag – börja här" subtitle="Ta det som är bråttom först.">
        <ol className="m-0 space-y-2 pl-5 text-sm"><li>Öppna Idag. Ta försenade datum och svar som snart måste lämnas.</li><li>Ge varje uppgift en ansvarig och ett sista datum.</li><li>Anteckna utfört arbete. Dokumentera ändringar och hinder direkt.</li></ol>
        <div className="flex flex-wrap gap-2">{["idag", "punkter", "dagbok"].map(knapp)}</div>
      </Card>
      <Card id="metod-vecka" title="Varje vecka – stäm av" subtitle="Avsätt en fast tid för varje projekt.">
        <ol className="m-0 space-y-2 pl-5 text-sm"><li>Gör Veckokoll och följ upp gamla beslut.</li><li>Jämför tidplan, bemanning, budget och verklig kostnad.</li><li>Ta upp risker, ÄTA, öppna fel och dokumentation på byggmötet.</li></ol>
        <div className="flex flex-wrap gap-2">{["vecka", "tidplan", "budget", "moten"].map(knapp)}</div>
      </Card>
    </div>
    <section aria-labelledby="metod-steg"><h2 id="metod-steg" className="mb-3 text-xl">Hela projektet i sex steg</h2>
      <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">{METODSTEG.map((steg) => {
        const relevanta = faser.filter((f) => steg.faser.includes(f.fas.nr));
        const passerade = relevanta.filter((f) => f.grind.passerad).length;
        return <li key={steg.namn}><Card title={steg.namn}>
          <p className="m-0 text-sm">{steg.text}</p>
          <p className="m-0 text-sm text-ink-soft"><b>Spara som bevis:</b> {steg.bevis}.</p>
          {p ? <p className="m-0 text-xs text-ink-soft">{passerade} av {relevanta.length} fasgrindar passerade enligt byggöversikten. Provresultat granskas separat.</p> : null}
          <div className="flex flex-wrap gap-2">{steg.vyer.map(knapp)}{p ? <button type="button" className="btn sec mini" onClick={() => { setValtProjekt(p.id); oppnaPost("epc", `fas-${steg.faser[0]}`); }}>Visa stegets byggfaser</button> : null}</div>
        </Card></li>;
      })}</ol>
    </section>
    <Card id="metod-kontroll" title="En bock, ett prov och ett klartecken är olika saker">
      <dl className="m-0 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="font-bold">Byggchecklistan</dt><dd className="m-0 mt-1">Visar arbetsläget och fasgrindar. En punkt kan vara klar genom en passerad grind.</dd></div><div><dt className="font-bold">Egenkontrollen</dt><dd className="m-0 mt-1">Sparar verkligt resultat, datum, kontrollant och bevis per projekt och kontrollomfattning.</dd></div><div><dt className="font-bold">Överlämningen</dt><dd className="m-0 mt-1">Kräver granskade handlingar, hanterade fel och dokumenterat mottagande enligt kontraktet.</dd></div></dl>
      <p className="m-0 text-sm text-ink-soft">Byggöversikten kan också härleda en passerad grind från fakturerad betalning eller en senare grind. Det fyller aldrig i ett tekniskt provresultat.</p>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn" disabled={!p} onClick={() => { setValtProjekt(p.id); oppnaFaltmaterial({ mallpaket: "projekt" }); }}>Egenkontroller och fältmaterial</button>{knapp("slutdok")}</div>
    </Card>
    <Card id="metod-handelser" title="Var skriver jag det som händer?">
      <div className="grid gap-3 text-sm sm:grid-cols-2">{[
        ["punkter", "Något behöver göras", "Skriv en uppgift med ansvarig och datum."],
        ["risker", "Något kan gå fel", "Skriv en risk och bestäm en förebyggande åtgärd."],
        ["ata", "Arbetets omfattning ändras", "Skapa ÄTA-ärende och spara underrättelse eller beställning."],
        ["storning", "Planerat arbete stoppas", "Dokumentera hindret, påverkan och underrättelsen."],
      ].map(([vy, t, beskrivning]) => <div key={vy} className="rounded-sm bg-sunken p-3"><b>{t}</b><p className="my-2">{beskrivning}</p>{knapp(vy)}</div>)}</div>
      <p className="m-0 text-sm text-ink-soft">Samma händelse kan behöva både dagboksbevis och ett ÄTA-/hinderärende. Spara referenser mellan underlagen.</p>
    </Card>
    <Card id="metod-anpassa" title="Kontrollera detta i varje nytt projekt">
      <ul className="m-0 space-y-2 pl-5 text-sm"><li>Vad ingår i kontraktet, och vem ansvarar för varje del?</li><li>Stämmer tidplan, betalningssteg, priser, frister och dokumentkrav?</li><li>Vilka tillverkare och modeller används? Vilka manualrevisioner gäller?</li><li>Vilka kontroller behöver varje enhet? Vilka prov ska beställaren bevittna?</li><li>Var lagras originalhandlingar, foton och protokoll? Kontrollera synkstatus och ta backup.</li></ul>
      <p className="m-0 text-sm text-ink-soft">BESS- och kontraktsmallarna bygger delvis på Batch C. De är en utgångspunkt. Namn som SharePoint, IFS och ENIA i instruktionerna betyder inte att sidan automatiskt skriver till dessa system.</p>
      {knapp("data")}
    </Card>
    <Card id="metod-ord" title="Ordlista – svåra ord på vanlig svenska">
      <label className="flex flex-col gap-1 text-sm">Sök i ordlistan<input type="search" value={ord} onChange={(e) => setOrd(e.target.value)} placeholder="Till exempel ÄTA, grind eller PCS" /></label>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">{ORDLISTA.filter(([n, t]) => `${n} ${t}`.toLocaleLowerCase("sv").includes(ord.toLocaleLowerCase("sv").trim())).map(([n, t]) => <div key={n} className="rounded-sm bg-sunken p-3 text-sm"><dt className="font-bold">{n}</dt><dd className="m-0 mt-1">{t}</dd></div>)}</dl>
    </Card>
  </div>;
}
