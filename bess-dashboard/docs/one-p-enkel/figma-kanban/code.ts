/* ONE P – Kanbantavla med ÄTA. Figma-plugin utan gränssnitt.

   Ritar fyra kolumner (Backlog, Pågående, ÄTA-granskning, Klart) och fyller dem
   med kort som INSTANSER av två komponenter: "Kort / Uppgift" och "Kort / ÄTA".
   Ändrar du komponenten ändras alla kort. Exempelkorten längst ner är påhitt för
   att visa tavlan, inte projektdata — byt ut dem i KORT nedan.

   Körning: Plugins > Development > Import plugin from manifest… > välj manifest.json,
   sedan Plugins > Development > ONE P – Kanbantavla med ÄTA. */

type Typ = "uppgift" | "A" | "T" | "AV"; // uppgift, Ändring, Tillägg, Avgående
type Kolumn = "backlog" | "pagaende" | "ata" | "klart";

interface Kort {
  kolumn: Kolumn;
  titel: string;
  meta: string; // ansvarig · datum
  typ: Typ;
  nr?: string; // ÄTA-nummer
}

const KOLUMNER: { id: Kolumn; namn: string; hjalp: string }[] = [
  { id: "backlog", namn: "Backlog", hjalp: "Sorterat efter värde" },
  { id: "pagaende", namn: "Pågående", hjalp: "Max 3 kort per person" },
  { id: "ata", namn: "ÄTA-granskning", hjalp: "Underrätta ≤ 24 h · typ · pris · beslut" },
  { id: "klart", namn: "Klart", hjalp: "Utfört och dokumenterat" },
];

const TYPNAMN: Record<Exclude<Typ, "uppgift">, string> = { A: "Ändring", T: "Tillägg", AV: "Avgående" };

/* Exempeldata. Namn och datum är påhittade. */
const KORT: Kort[] = [
  { kolumn: "backlog", titel: "Beställ skyltar", meta: "Ansvarig saknas · v. 45", typ: "uppgift" },
  { kolumn: "backlog", titel: "Inköpsmatris, kvarvarande materiel", meta: "Anna · v. 46", typ: "uppgift" },
  { kolumn: "pagaende", titel: "Fundament F3, gjutning", meta: "Bo · 28 okt", typ: "uppgift" },
  { kolumn: "pagaende", titel: "Kabelskåp levererat med fel typ", meta: "Anna · 24 okt", typ: "uppgift" },
  { kolumn: "ata", titel: "Flytta fundament F3 på beställarens begäran", meta: "Anna · beslut väntas", typ: "A", nr: "ÄTA-004" },
  { kolumn: "ata", titel: "Extra kabelschakt", meta: "Bo · pris skickat", typ: "T", nr: "ÄTA-005" },
  { kolumn: "ata", titel: "Utgår: stängsel mot norr", meta: "Anna · underrättad", typ: "AV", nr: "ÄTA-006" },
  { kolumn: "klart", titel: "Etablering klar", meta: "Bo · 14 okt", typ: "uppgift" },
];

const FARG = {
  bakgrund: { r: 0.97, g: 0.98, b: 0.98 },
  kolumn: { r: 0.9, g: 0.95, b: 0.96 },
  ata: { r: 1, g: 0.96, b: 0.88 },
  kort: { r: 1, g: 1, b: 1 },
  text: { r: 0.04, g: 0.16, b: 0.2 },
  dimmad: { r: 0.35, g: 0.42, b: 0.45 },
  ljus: { r: 0.0, g: 0.37, b: 0.46 },
  orange: { r: 0.78, g: 0.47, b: 0.0 },
};

const fyll = (c: RGB): Paint[] => [{ type: "SOLID", color: c }];

function text(tecken: string, storlek: number, fet: boolean, farg: RGB, namn: string): TextNode {
  const t = figma.createText();
  t.name = namn;
  t.fontName = { family: "Inter", style: fet ? "Bold" : "Regular" };
  t.fontSize = storlek;
  t.characters = tecken;
  t.fills = fyll(farg);
  return t;
}

/** Ett kort som komponent. ÄTA-kortet har en orange kant och en typetikett. */
function skapaKortKomponent(ata: boolean): ComponentNode {
  const k = figma.createComponent();
  k.name = ata ? "Kort / ÄTA" : "Kort / Uppgift";
  k.layoutMode = "VERTICAL";
  k.primaryAxisSizingMode = "AUTO";
  k.counterAxisSizingMode = "FIXED";
  k.resize(260, 80);
  k.itemSpacing = 6;
  k.paddingTop = k.paddingBottom = 12;
  k.paddingLeft = k.paddingRight = 12;
  k.cornerRadius = 8;
  k.fills = fyll(FARG.kort);
  k.strokes = fyll(ata ? FARG.orange : FARG.kolumn);
  k.strokeWeight = ata ? 2 : 1;
  if (ata) k.appendChild(text("ÄTA-000 · Ändring", 11, true, FARG.orange, "typ"));
  const titel = text("Titel", 14, true, FARG.text, "titel");
  titel.layoutAlign = "STRETCH";
  titel.textAutoResize = "HEIGHT";
  k.appendChild(titel);
  k.appendChild(text("Ansvarig · datum", 12, false, FARG.dimmad, "meta"));
  return k;
}

function satt(instans: InstanceNode, namn: string, tecken: string) {
  const n = instans.findOne((x) => x.type === "TEXT" && x.name === namn) as TextNode | null;
  if (n) n.characters = tecken;
}

function skapaInstans(komp: ComponentNode, kort: Kort): InstanceNode {
  const i = komp.createInstance();
  i.name = kort.nr ? `${kort.nr} ${kort.titel}` : kort.titel;
  satt(i, "titel", kort.titel);
  satt(i, "meta", kort.meta);
  if (kort.nr && kort.typ !== "uppgift") satt(i, "typ", `${kort.nr} · ${TYPNAMN[kort.typ]}`);
  i.layoutAlign = "STRETCH";
  return i;
}

async function huvud() {
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
  ]);

  const standard = skapaKortKomponent(false);
  const ataKomp = skapaKortKomponent(true);

  const tavla = figma.createFrame();
  tavla.name = "ONE P – Kanban";
  tavla.layoutMode = "HORIZONTAL";
  tavla.primaryAxisSizingMode = "AUTO";
  tavla.counterAxisSizingMode = "AUTO";
  tavla.itemSpacing = 16;
  tavla.paddingTop = tavla.paddingBottom = tavla.paddingLeft = tavla.paddingRight = 24;
  tavla.fills = fyll(FARG.bakgrund);

  for (const kol of KOLUMNER) {
    const ram = figma.createFrame();
    ram.name = kol.namn;
    ram.layoutMode = "VERTICAL";
    ram.primaryAxisSizingMode = "AUTO";
    ram.counterAxisSizingMode = "FIXED";
    ram.resize(300, 100);
    ram.itemSpacing = 10;
    ram.paddingTop = ram.paddingBottom = ram.paddingLeft = ram.paddingRight = 16;
    ram.cornerRadius = 12;
    ram.fills = fyll(kol.id === "ata" ? FARG.ata : FARG.kolumn);
    ram.appendChild(text(kol.namn, 16, true, kol.id === "ata" ? FARG.orange : FARG.ljus, "rubrik"));
    const hjalp = text(kol.hjalp, 12, false, FARG.dimmad, "hjälp");
    hjalp.layoutAlign = "STRETCH";
    hjalp.textAutoResize = "HEIGHT";
    ram.appendChild(hjalp);
    for (const kort of KORT.filter((k) => k.kolumn === kol.id)) {
      ram.appendChild(skapaInstans(kort.typ === "uppgift" ? standard : ataKomp, kort));
    }
    tavla.appendChild(ram);
  }

  // Komponenterna ligger bredvid tavlan, så att man hittar dem och kan ändra utseendet.
  standard.x = tavla.width + 80;
  standard.y = 0;
  ataKomp.x = tavla.width + 80;
  ataKomp.y = 160;

  figma.currentPage.appendChild(tavla);
  figma.viewport.scrollAndZoomIntoView([tavla, standard, ataKomp]);
  figma.closePlugin(`Ritade tavlan med ${KORT.length} kort.`);
}

huvud().catch((fel) => figma.closePlugin(`Något gick fel: ${fel instanceof Error ? fel.message : String(fel)}`));
