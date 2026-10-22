import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  BCF_VERSION,
  STATUS_TILL_BCF,
  arGuid,
  arIfcGuid,
  bcfFilnamn,
  bcfKameraTillViewpoint,
  bcfStatusTillAta,
  bcfTypTillKlass,
  byggBcf,
  byggMarkup,
  byggViewpoint,
  dataUrlTillBytes,
  franBcf,
  importSammanfattning,
  komponenterFor,
  lasBcf,
  nyGuid,
  parsaXml,
  planeraImport,
  tillBcf,
  viewpointTillBcfKamera,
  xmlAvkoda,
  xmlEsc,
} from "./bcfHanterare.js";
import { boundingBoxFor } from "./modellKoppling.js";
import { nyAtaPost } from "./nyaPoster.js";

/* BCF 2.1 — XML, JSON-motsvarigheter, zip och import. Allt utan WebGL och utan DOM. */

const IFC_GUID = "2O2Fr$t4X7Zf8NOew3FNr2";
const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
const GUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const arende = (extra = {}) => ({
  id: "u1",
  projektId: "p1",
  nr: "UR001",
  benamning: "Extra kabelränna <vid> container & trafo",
  status: "oppen",
  klass: "ata",
  handelseDatum: "2026-10-05",
  ansvarig: "Alex Young",
  objectGuid: "so1",
  viewpoint: { cameraPosition: [10, 8, 20], target: [10, 1.45, -5], fov: 55 },
  ...extra,
});

describe("GUID", () => {
  it("nyGuid ger en giltig v4-UUID och aldrig samma två gånger", () => {
    const a = nyGuid();
    expect(arGuid(a)).toBe(true);
    expect(a[14]).toBe("4");
    expect("89ab").toContain(a[19]);
    expect(nyGuid()).not.toBe(a);
  });

  it("kan köras utan Web Crypto", () => {
    expect(arGuid(nyGuid({}))).toBe(true);
  });

  it("känner igen IFC-GUID (22 tecken) och UUID", () => {
    expect(arIfcGuid(IFC_GUID)).toBe(true);
    expect(arIfcGuid("so1")).toBe(false);
    expect(arIfcGuid(GUID)).toBe(false);
    expect(arGuid(GUID)).toBe(true);
    expect(arGuid("inte-en-guid")).toBe(false);
  });
});

describe("koordinater Y upp ↔ Z upp", () => {
  it("är varandras inverser", () => {
    for (const p of [[1, 2, 3], [-5, 0, 9], [0, 0, 0]]) expect(franBcf(tillBcf(p)).map((v) => v + 0)).toEqual(p.map((v) => v + 0));
  });

  it("höjd (appens Y) blir BCF:s Z, och norr (appens −Z) blir BCF:s +Y", () => {
    expect(tillBcf([0, 5, 0])).toEqual([0, -0, 5]);
    expect(tillBcf([0, 0, -7])[1]).toBe(7);
  });

  it("kameravyn överlever en rundtur genom BCF:s kamera", () => {
    const vp = { cameraPosition: [10, 8, 20], target: [10, 1.45, -5], fov: 55 };
    const k = viewpointTillBcfKamera(vp);
    expect(Math.hypot(...k.riktning)).toBeCloseTo(1, 9);
    expect(k.upp).toEqual([0, 0, 1]);
    const avstand = Math.hypot(0, 8 - 1.45, 25);
    const tillbaka = bcfKameraTillViewpoint({ position: k.position, riktning: k.riktning, fov: k.fov }, avstand);
    tillbaka.cameraPosition.forEach((v, i) => expect(v).toBeCloseTo(vp.cameraPosition[i], 2));
    tillbaka.target.forEach((v, i) => expect(v).toBeCloseTo(vp.target[i], 2));
    expect(tillbaka.fov).toBe(55);
  });

  it("rakt uppifrån får en vågrät upp-vektor i stället för en parallell", () => {
    const k = viewpointTillBcfKamera({ cameraPosition: [0, 20, 0], target: [0, 0, 0], fov: 55 });
    expect(k.upp).toEqual([0, 1, 0]);
  });
});

describe("XML: skriva", () => {
  it("escapar farliga tecken och tar bort ogiltiga styrtecken", () => {
    expect(xmlEsc(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;");
    expect(xmlEsc("a\u0000b\u0008c")).toBe("abc");
    expect(xmlEsc("åäö 😀")).toBe("åäö 😀");
    expect(xmlEsc(null)).toBe("");
  });

  it("markup.bcf är välformad och bär topic-attribut, titel, etiketter och viewpointreferens", () => {
    const xml = byggMarkup(arende(), { topicGuid: GUID, viewpointGuid: "v-guid", harSnapshot: true, forfattare: "Kim & Co", projektNamn: "Växjö" });
    const rot = parsaXml(xml);
    expect(rot.namn).toBe("Markup");
    const t = rot.barn.find((b) => b.namn === "Topic");
    expect(t.attr).toMatchObject({ Guid: GUID, TopicType: "ÄTA", TopicStatus: "Open" });
    expect(t.barn.find((b) => b.namn === "Title").text).toBe("Extra kabelränna <vid> container & trafo");
    expect(t.barn.find((b) => b.namn === "CreationAuthor").text).toBe("Kim & Co");
    expect(t.barn.find((b) => b.namn === "CreationDate").text).toBe("2026-10-05T00:00:00Z");
    expect(t.barn.find((b) => b.namn === "AssignedTo").text).toBe("Alex Young");
    const etiketter = t.barn.filter((b) => b.namn === "Labels").map((b) => b.text);
    expect(etiketter).toEqual(["ata-nr:UR001", "ata-status:oppen", "ata-klass:ata"]);
    const vp = rot.barn.find((b) => b.namn === "Viewpoints");
    expect(vp.attr.Guid).toBe("v-guid");
    expect(vp.barn.find((b) => b.namn === "Viewpoint").text).toBe("viewpoint.bcfv");
    expect(vp.barn.find((b) => b.namn === "Snapshot").text).toBe("snapshot.png");
  });

  it("utan viewpoint och skärmdump finns inga Viewpoints; utan snapshot ingen Snapshot", () => {
    expect(parsaXml(byggMarkup(arende(), { topicGuid: GUID, viewpointGuid: null })).barn.some((b) => b.namn === "Viewpoints")).toBe(false);
    const vp = parsaXml(byggMarkup(arende(), { topicGuid: GUID, viewpointGuid: "v", harSnapshot: false })).barn.find((b) => b.namn === "Viewpoints");
    expect(vp.barn.some((b) => b.namn === "Snapshot")).toBe(false);
  });

  it("viewpoint.bcfv har kamera i BCF-koordinater och valt objekt som komponent", () => {
    const rot = parsaXml(byggViewpoint(arende(), { viewpointGuid: "v" }));
    expect(rot.namn).toBe("VisualizationInfo");
    const cam = rot.barn.find((b) => b.namn === "PerspectiveCamera");
    const punkt = cam.barn.find((b) => b.namn === "CameraViewPoint");
    expect(punkt.barn.map((b) => Number(b.text))).toEqual([10, -20, 8]);
    expect(Number(cam.barn.find((b) => b.namn === "FieldOfView").text)).toBe(55);
    const komp = rot.barn.find((b) => b.namn === "Components").barn[0].barn[0];
    expect(komp.attr.IfcGuid).toBeUndefined(); // "so1" är inget IFC-GUID
    expect(komp.barn.find((b) => b.namn === "AuthoringToolId").text).toBe("so1");
  });

  it("ett riktigt IFC-GUID skrivs som IfcGuid", () => {
    const rot = parsaXml(byggViewpoint(arende({ objectGuid: IFC_GUID }), { viewpointGuid: "v" }));
    expect(rot.barn.find((b) => b.namn === "Components").barn[0].barn[0].attr.IfcGuid).toBe(IFC_GUID);
  });

  it("komponenterFor: objektet, annars komponenter från en tidigare import", () => {
    expect(komponenterFor({ objectGuid: "a", bcfKomponenter: ["x"] })).toEqual(["a"]);
    expect(komponenterFor({ bcfKomponenter: ["x", "y"] })).toEqual(["x", "y"]);
    expect(komponenterFor({})).toEqual([]);
  });
});

describe("XML: läsa", () => {
  it("läser element, attribut, text och barn", () => {
    const r = parsaXml('<?xml version="1.0"?><a x="1" y=\'två\'><b>hej</b><c/><b>igen</b></a>');
    expect(r.namn).toBe("a");
    expect(r.attr).toEqual({ x: "1", y: "två" });
    expect(r.barn.map((b) => b.namn)).toEqual(["b", "c", "b"]);
    expect(r.barn[0].text).toBe("hej");
  });

  it("avkodar entiteter och teckenreferenser, och läser CDATA som text", () => {
    expect(xmlAvkoda("&lt;a&gt; &amp; &quot;x&quot; &apos;y&apos; &#228; &#xE5;")).toBe(`<a> & "x" 'y' ä å`);
    expect(xmlAvkoda("&okand;")).toBe("&okand;");
    expect(parsaXml("<a><![CDATA[<raw> & text]]></a>").text).toBe("<raw> & text");
  });

  it("hoppar över kommentarer, deklaration och DOCTYPE, och tar bort namnrymdsprefix", () => {
    const r = parsaXml('﻿<?xml version="1.0"?><!DOCTYPE x><!-- hej --><n:a xmlns:n="u" n:k="v"><n:b/></n:a>');
    expect(r.namn).toBe("a");
    expect(r.attr).toEqual({ k: "v" });
    expect(r.barn[0].namn).toBe("b");
  });

  it("citerade attribut får innehålla > utan att tappa taggen", () => {
    expect(parsaXml('<a v="1 > 0"><b/></a>').attr.v).toBe("1 > 0");
  });

  it("kastar på trasig XML med ett begripligt fel", () => {
    expect(() => parsaXml("<a><b></a>")).toThrow(/matchar inte/);
    expect(() => parsaXml("<a>")).toThrow(/inte avslutat/);
    expect(() => parsaXml("")).toThrow(/inget rotelement/);
    expect(() => parsaXml("<a/><b/>")).toThrow(/mer än ett rotelement/);
    expect(() => parsaXml("text<a/>")).toThrow(/utanför rotelementet/);
    expect(() => parsaXml("<a><!-- öppen")).toThrow(/kommentar/);
    expect(() => parsaXml("<a b='x>")).toThrow(/starttagg/);
  });

  it("skriv → läs är förlustfritt för text med specialtecken", () => {
    const t = `Åke "Ö" <x> & 'y' 😀`;
    const r = parsaXml(byggMarkup(arende({ benamning: t }), { topicGuid: GUID, viewpointGuid: null }));
    expect(r.barn.find((b) => b.namn === "Topic").barn.find((b) => b.namn === "Title").text).toBe(t);
  });
});

describe("status och typ", () => {
  it("varje ÄTA-status har en BCF-status", () => {
    for (const v of Object.values(STATUS_TILL_BCF)) expect(["Open", "In Progress", "Resolved", "Closed"]).toContain(v);
    expect(STATUS_TILL_BCF.stangd).toBe("Closed");
  });

  it("etiketten ata-status går före gissningen, och okänt blir Öppen", () => {
    expect(bcfStatusTillAta("Closed", "fakturerad")).toBe("fakturerad");
    expect(bcfStatusTillAta("Closed", "")).toBe("stangd");
    expect(bcfStatusTillAta("Resolved", "")).toBe("godkand");
    expect(bcfStatusTillAta("In Progress", "")).toBe("prissattning");
    expect(bcfStatusTillAta(" open ", "")).toBe("oppen");
    expect(bcfStatusTillAta("Konstig", "finns-inte")).toBe("oppen");
    expect(bcfStatusTillAta(undefined, undefined)).toBe("oppen");
  });

  it("typ → klass: etikett först, annars ord i texten", () => {
    expect(bcfTypTillKlass("Issue", "hinder")).toBe("hinder");
    expect(bcfTypTillKlass("ÄTA", "")).toBe("ata");
    expect(bcfTypTillKlass("Hinder", "")).toBe("hinder");
    expect(bcfTypTillKlass("Hinder och ÄTA", "")).toBe("bada");
    expect(bcfTypTillKlass("Clash", "")).toBe("oklar");
    expect(bcfTypTillKlass("", "")).toBe("oklar");
  });
});

describe("byggBcf och lasBcf — rundtur genom en riktig zip", () => {
  it("zippen innehåller bcf.version, project.bcfp och markup/viewpoint/snapshot per ärende", async () => {
    const { data, antal, nyaGuid } = await byggBcf([arende({ bcfGuid: GUID })], { snapshots: { u1: PNG }, forfattare: "Kim", projektNamn: "36037 Växjö" });
    expect(antal).toBe(1);
    expect(nyaGuid).toEqual({}); // ärendet hade redan ett bcfGuid
    const zip = await JSZip.loadAsync(data);
    expect(Object.keys(zip.files).sort()).toEqual(["bcf.version", `${GUID}/`, `${GUID}/markup.bcf`, `${GUID}/snapshot.png`, `${GUID}/viewpoint.bcfv`, "project.bcfp"].sort());
    expect(parsaXml(await zip.file("bcf.version").async("string")).attr.VersionId).toBe(BCF_VERSION);
    expect([...(await zip.file(`${GUID}/snapshot.png`).async("uint8array"))]).toEqual([...PNG]);
  });

  it("ärenden utan bcfGuid får ett nytt, som rapporteras tillbaka", async () => {
    const { data, nyaGuid } = await byggBcf([arende()]);
    expect(arGuid(nyaGuid.u1)).toBe(true);
    const zip = await JSZip.loadAsync(data);
    expect(zip.file(`${nyaGuid.u1}/markup.bcf`)).toBeTruthy();
  });

  it("utan skärmdump finns ingen snapshot.png, och utan vy och objekt ingen viewpoint", async () => {
    const { data } = await byggBcf([arende({ bcfGuid: GUID }), arende({ id: "u2", bcfGuid: "4f2504e0-4f89-41d3-9a0c-0305e82c3302", objectGuid: undefined, viewpoint: undefined })]);
    const namn = Object.keys((await JSZip.loadAsync(data)).files);
    expect(namn.some((n) => n.endsWith("snapshot.png"))).toBe(false);
    expect(namn.filter((n) => n.endsWith("viewpoint.bcfv"))).toHaveLength(1);
  });

  it("rundtur: det som skrivs läses tillbaka — titel, status, klass, nummer, ansvarig, kamera och objekt", async () => {
    const { data } = await byggBcf([arende({ bcfGuid: GUID, status: "godkand", klass: "bada" })], { snapshots: { u1: PNG }, forfattare: "Kim" });
    const r = await lasBcf(data);
    expect(r.version).toBe("2.1");
    expect(r.topics).toHaveLength(1);
    const t = r.topics[0];
    expect(t).toMatchObject({
      guid: GUID,
      titel: "Extra kabelränna <vid> container & trafo",
      typ: "Hinder och ÄTA",
      status: "Resolved",
      ataStatus: "godkand",
      ataKlass: "bada",
      ataNr: "UR001",
      tilldelad: "Alex Young",
      forfattare: "Kim",
    });
    expect(t.viewpoint.komponenter).toEqual([{ ifcGuid: "", authoringId: "so1" }]);
    expect(t.viewpoint.kamera.fov).toBe(55);
    expect([...t.snapshot]).toEqual([...PNG]);
    expect(r.antalKommentarer).toBe(0);
  });

  it("flera ärenden i en fil", async () => {
    const lista = [arende({ id: "a", bcfGuid: nyGuid() }), arende({ id: "b", bcfGuid: nyGuid() }), arende({ id: "c", bcfGuid: nyGuid() })];
    const r = await lasBcf((await byggBcf(lista)).data);
    expect(r.topics.map((t) => t.guid).sort()).toEqual(lista.map((u) => u.bcfGuid).sort());
  });

  it("tom lista ger en giltig zip utan ärenden som lasBcf avvisar med förklaring", async () => {
    const { data } = await byggBcf([]);
    await expect(lasBcf(data)).rejects.toThrow(/inga ÄTA/);
  });
});

describe("lasBcf — felhantering och främmande filer", () => {
  const zipMed = async (filer) => {
    const z = new JSZip();
    for (const [n, v] of Object.entries(filer)) z.file(n, v);
    return z.generateAsync({ type: "uint8array" });
  };
  const markup = (topic, extra = "") => `<?xml version="1.0"?><Markup><Topic ${topic}><Title>T</Title></Topic>${extra}</Markup>`;

  it("en fil som inte är en zip ger ett tydligt fel", async () => {
    await expect(lasBcf(Uint8Array.from([1, 2, 3, 4]))).rejects.toThrow(/ingen giltig zip/);
    await expect(lasBcf(new TextEncoder().encode("hej"))).rejects.toThrow(/zip/);
  });

  it("BCF 3.0 stöds inte och förklaras", async () => {
    const d = await zipMed({ "bcf.version": '<Version VersionId="3.0"/>', "x/markup.bcf": markup(`Guid="${GUID}"`) });
    await expect(lasBcf(d)).rejects.toThrow(/BCF 3.0 stöds inte/);
  });

  it("BCF 2.0 och en fil utan bcf.version läses", async () => {
    expect((await lasBcf(await zipMed({ "bcf.version": '<Version VersionId="2.0"/>', "x/markup.bcf": markup(`Guid="${GUID}"`) }))).version).toBe("2.0");
    expect((await lasBcf(await zipMed({ "x/markup.bcf": markup(`Guid="${GUID}"`) }))).version).toBe("okänd");
  });

  it("ett trasigt topic hoppas över med varning, de andra läses", async () => {
    const d = await zipMed({ "bra/markup.bcf": markup(`Guid="${GUID}"`), "trasig/markup.bcf": "<Markup><Topic>", "utanguid/markup.bcf": markup("") });
    const r = await lasBcf(d);
    expect(r.topics).toHaveLength(1);
    expect(r.varningar).toHaveLength(2);
    expect(r.varningar.join(" ")).toMatch(/trasig/);
  });

  it("när inget går att läsa kastas ett fel med varningarna", async () => {
    await expect(lasBcf(await zipMed({ "a/markup.bcf": "<x" }))).rejects.toThrow(/Inga ÄTA gick att läsa/);
  });

  it("en trasig viewpoint tar inte med sig topicet", async () => {
    const d = await zipMed({ "a/markup.bcf": markup(`Guid="${GUID}"`, '<Viewpoints Guid="v"><Viewpoint>viewpoint.bcfv</Viewpoint></Viewpoints>'), "a/viewpoint.bcfv": "<VisualizationInfo><Components>" });
    const r = await lasBcf(d);
    expect(r.topics[0].viewpoint).toBeNull();
    expect(r.varningar[0]).toMatch(/kameravyn hoppades över/);
  });

  it("kommentarer räknas men läses inte in", async () => {
    const d = await zipMed({ "a/markup.bcf": markup(`Guid="${GUID}"`, '<Comment Guid="c1"><Comment>hej</Comment></Comment><Comment Guid="c2"/>') });
    expect((await lasBcf(d)).antalKommentarer).toBe(2);
  });

  it("andra filnamn än viewpoint.bcfv och snapshot.png följs via markup", async () => {
    const vp = '<VisualizationInfo Guid="v"><PerspectiveCamera><CameraViewPoint><X>1</X><Y>2</Y><Z>3</Z></CameraViewPoint><CameraDirection><X>0</X><Y>1</Y><Z>0</Z></CameraDirection><CameraUpVector><X>0</X><Y>0</Y><Z>1</Z></CameraUpVector><FieldOfView>60</FieldOfView></PerspectiveCamera></VisualizationInfo>';
    const d = await zipMed({ "a/markup.bcf": markup(`Guid="${GUID}"`, '<Viewpoints Guid="v"><Viewpoint>kam.bcfv</Viewpoint><Snapshot>bild.png</Snapshot></Viewpoints>'), "a/kam.bcfv": vp, "a/bild.png": PNG });
    const t = (await lasBcf(d)).topics[0];
    expect(t.viewpoint.kamera).toEqual({ position: [1, 2, 3], riktning: [0, 1, 0], fov: 60 });
    expect([...t.snapshot]).toEqual([...PNG]);
  });

  it("orimligt synfält ger standardvärdet, och ortogonal kamera ger en varning", async () => {
    const kam = (fov) => `<VisualizationInfo><PerspectiveCamera><CameraViewPoint><X>0</X><Y>0</Y><Z>0</Z></CameraViewPoint><CameraDirection><X>0</X><Y>1</Y><Z>0</Z></CameraDirection><FieldOfView>${fov}</FieldOfView></PerspectiveCamera></VisualizationInfo>`;
    const mu = markup(`Guid="${GUID}"`, '<Viewpoints Guid="v"><Viewpoint>viewpoint.bcfv</Viewpoint></Viewpoints>');
    expect((await lasBcf(await zipMed({ "a/markup.bcf": mu, "a/viewpoint.bcfv": kam(999) }))).topics[0].viewpoint.kamera.fov).toBe(55);
    const o = await lasBcf(await zipMed({ "a/markup.bcf": mu, "a/viewpoint.bcfv": "<VisualizationInfo><OrthogonalCamera/></VisualizationInfo>" }));
    expect(o.topics[0].viewpoint.kamera).toBeNull();
    expect(o.varningar.join(" ")).toMatch(/ortogonal/);
  });

  it("en IfcGuid-komponent läses, både med och utan AuthoringToolId", async () => {
    const vp = `<VisualizationInfo><Components><Selection><Component IfcGuid="${IFC_GUID}"/><Component><AuthoringToolId>so9</AuthoringToolId></Component><Component/></Selection></Components></VisualizationInfo>`;
    const d = await zipMed({ "a/markup.bcf": markup(`Guid="${GUID}"`, '<Viewpoints Guid="v"><Viewpoint>viewpoint.bcfv</Viewpoint></Viewpoints>'), "a/viewpoint.bcfv": vp });
    expect((await lasBcf(d)).topics[0].viewpoint.komponenter).toEqual([
      { ifcGuid: IFC_GUID, authoringId: "" },
      { ifcGuid: "", authoringId: "so9" },
    ]);
  });
});

describe("planeraImport()", () => {
  const container = { id: "so1", typ: "container", namn: "Container 1", x: 10, z: -5, rotation: 0, bredd: 6.1, djup: 2.5, hojd: 2.9, projektId: "p1" };
  const topic = (extra = {}) => ({
    guid: nyGuid(),
    titel: "Importerat",
    typ: "ÄTA",
    status: "Open",
    beskrivning: "",
    forfattare: "Kim",
    datum: "2026-09-30T10:00:00Z",
    tilldelad: "",
    ataNr: "",
    ataStatus: "",
    ataKlass: "",
    viewpoint: null,
    snapshot: null,
    ...extra,
  });
  const ctx = (extra = {}) => {
    const state = { ur: [] };
    return { ur: [], projektId: "p1", objekt: [container], lada: boundingBoxFor, skapaPost: (f) => ((state.ur = [...state.ur, nyAtaPost(state, "p1", f)]), state.ur.at(-1)), ...extra };
  };

  it("skapar nya ärenden med fortlöpande nummer och datum från CreationDate", () => {
    const p = planeraImport([topic(), topic({ datum: "2026-10-01" })], ctx());
    expect(p.nya.map((u) => u.nr)).toEqual(["UR001", "UR002"]);
    expect(p.nya[0].handelseDatum).toBe("2026-09-30");
    expect(p.nya[1].handelseDatum).toBe("2026-10-01");
    expect(p.uppdatera).toEqual([]);
    expect(p.nya[0]).toMatchObject({ projektId: "p1", benamning: "Importerat", status: "oppen", klass: "ata" });
  });

  it("ett topic med ett känt bcfGuid uppdaterar i stället för att skapa en dubblett", () => {
    const g = nyGuid();
    const p = planeraImport([topic({ guid: g, titel: "Ny titel", status: "Closed" })], ctx({ ur: [{ id: "u7", projektId: "p1", bcfGuid: g, nr: "UR007" }] }));
    expect(p.nya).toEqual([]);
    expect(p.uppdatera).toEqual([{ id: "u7", falt: expect.objectContaining({ benamning: "Ny titel", status: "stangd", bcfGuid: g }) }]);
  });

  it("samma guid i ett annat projekt räknas inte som befintligt", () => {
    const g = nyGuid();
    const p = planeraImport([topic({ guid: g })], ctx({ ur: [{ id: "u7", projektId: "annat", bcfGuid: g }] }));
    expect(p.nya).toHaveLength(1);
  });

  it("samma guid två gånger i filen ger ett ärende, inte två", () => {
    const g = nyGuid();
    const p = planeraImport([topic({ guid: g }), topic({ guid: g, titel: "Andra" })], ctx());
    expect(p.nya).toHaveLength(1);
    expect(p.uppdatera).toHaveLength(1);
  });

  it("en komponent som matchar ett objekt kopplas, med låda och en kamera som pekar mot objektet", () => {
    const vp = viewpointTillBcfKamera({ cameraPosition: [10, 8, 20], target: [10, 1.45, -5], fov: 50 });
    const p = planeraImport([topic({ viewpoint: { komponenter: [{ ifcGuid: "", authoringId: "so1" }], kamera: { position: vp.position, riktning: vp.riktning, fov: 50 } } })], ctx());
    const u = p.nya[0];
    expect(u.objectGuid).toBe("so1");
    expect(u.boundingBox).toEqual(boundingBoxFor(container));
    expect(u.viewpoint.fov).toBe(50);
    // Målet ligger vid objektets mitt (avståndet räknades från kameran till lådans centrum).
    u.viewpoint.target.forEach((v, i) => expect(v).toBeCloseTo([10, 1.45, -5][i], 1));
    expect(p.kopplade).toBe(1);
    expect(u.bcfKomponenter).toBeUndefined();
  });

  it("en komponent som inte finns sparas för senare koppling och räknas", () => {
    const p = planeraImport([topic({ viewpoint: { komponenter: [{ ifcGuid: IFC_GUID, authoringId: "" }], kamera: null } })], ctx());
    expect(p.nya[0].objectGuid).toBeUndefined();
    expect(p.nya[0].bcfKomponenter).toEqual([IFC_GUID]);
    expect(p.utanKoppling).toBe(1);
    expect(p.kopplade).toBe(0);
  });

  it("IfcGuid matchar mot objektets id (en IFC-modell i B2)", () => {
    const ifc = { id: IFC_GUID, typ: "ifc", namn: "Vägg", projektId: "p1" };
    const p = planeraImport([topic({ viewpoint: { komponenter: [{ ifcGuid: IFC_GUID, authoringId: "" }], kamera: null } })], ctx({ objekt: [ifc], lada: () => ({ min: [0, 0, 0], max: [1, 1, 1] }) }));
    expect(p.nya[0].objectGuid).toBe(IFC_GUID);
  });

  it("utan vy läggs inget viewpoint till, och tomma valfria fält utelämnas", () => {
    const u = planeraImport([topic()], ctx()).nya[0];
    expect(u.viewpoint).toBeUndefined();
    expect(u.bcfBeskrivning).toBeUndefined();
    expect(u.ansvarig).toBeUndefined();
  });

  it("ansvarig och beskrivning följer med när de finns", () => {
    const u = planeraImport([topic({ tilldelad: "Alex Young", beskrivning: "Se bild" })], ctx()).nya[0];
    expect(u.ansvarig).toBe("Alex Young");
    expect(u.bcfBeskrivning).toBe("Se bild");
  });

  it("ändrar inte indata", () => {
    const topics = [topic()];
    const kopia = JSON.stringify(topics);
    planeraImport(topics, ctx());
    expect(JSON.stringify(topics)).toBe(kopia);
  });

  it("sammanfattningen säger vad som händer, inklusive kommentarer och varningar", () => {
    const p = planeraImport([topic({ viewpoint: { komponenter: [{ ifcGuid: "", authoringId: "so1" }], kamera: null } }), topic()], ctx());
    expect(importSammanfattning(p)).toBe("2 nya ÄTA, 0 uppdateras, 1 kopplas till objekt.");
    expect(importSammanfattning(p, { antalKommentarer: 4, varningar: ["a", "b"] })).toMatch(/4 kommentarer läses inte in.*2 varningar/);
  });
});

describe("hjälpare", () => {
  it("filnamnet är säkert och bär datum", () => {
    expect(bcfFilnamn("36037 Växjö/Batteripark", new Date("2026-10-12T10:00:00Z"))).toBe("36037_Vaxjo_Batteripark_2026-10-12.bcfzip");
    expect(bcfFilnamn("", new Date("2026-10-12T10:00:00Z"))).toBe("arenden_2026-10-12.bcfzip");
    expect(bcfFilnamn("../../etc/passwd", new Date("2026-10-12T10:00:00Z"))).not.toMatch(/[/\\]/);
  });

  it("dataUrlTillBytes läser en PNG-URL och avvisar annat", () => {
    const url = `data:image/png;base64,${btoa(String.fromCharCode(...PNG))}`;
    expect([...dataUrlTillBytes(url)]).toEqual([...PNG]);
    expect(dataUrlTillBytes("data:image/jpeg;base64,AAAA")).toBeNull();
    expect(dataUrlTillBytes("")).toBeNull();
    expect(dataUrlTillBytes(undefined)).toBeNull();
  });
});
