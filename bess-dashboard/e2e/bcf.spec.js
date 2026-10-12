import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { expect, test } from "@playwright/test";
import { oppna } from "./hjalpare.js";

/* BCF 2.1: export av valda ärenden och import igen. XML, zip och koordinater är
   enhetstestade i src/lib/bcfHanterare.test.js — här provas flödet i webbläsaren,
   med riktig nedladdning, riktig skärmdump ur 3D-scenen och bekräftelsedialogen. */

const VY = "Siten i 3D";
const kort = (page) => page.getByRole("region", { name: /^Siten — / });
const lista = (page) => page.getByRole("list", { name: "Objekt" });
const arenden = (page) => page.getByRole("complementary", { name: "Ärenden på siten" });
const portfolj = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("batchc-portfolj-v1") || "{}"));

async function medArende(page, titel) {
  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await kort(page).getByRole("button", { name: "Placera mitt på tomten" }).click();
  await page.keyboard.press("Escape");
  await lista(page).getByRole("button", { name: /Container 1/ }).click();
  await arenden(page).getByRole("button", { name: "+ Ärende på objektet" }).click();
  await page.getByLabel("Kort beskrivning av händelsen").fill(titel);
  await page.getByRole("button", { name: "Registrera", exact: true }).click();
  await expect(arenden(page).getByRole("listitem")).toHaveCount(1);
}

/** Väljer en fil ur minnet. (Sökvägen till testets utdatamapp innehåller å/ä/ö, och då levereras inte filen.) */
async function valjFil(page, namn, buffer) {
  await arenden(page).getByLabel("Välj BCF-fil att importera").setInputFiles({ name: namn, mimeType: "application/zip", buffer });
}

async function exportera(page, testInfo) {
  await arenden(page).getByRole("checkbox").first().check();
  const nedladdning = page.waitForEvent("download");
  await arenden(page).getByRole("button", { name: /^Exportera BCF \(1\)/ }).click();
  const d = await nedladdning;
  const sokvag = testInfo.outputPath("export.bcfzip");
  await d.saveAs(sokvag);
  return { namn: d.suggestedFilename(), sokvag };
}

test("exporterar det valda ärendet till en .bcfzip med markup, viewpoint och skärmdump", async ({ page }, info) => {
  await oppna(page, VY);
  await expect(arenden(page).getByRole("button", { name: /^Exportera BCF \(0\)/ })).toBeDisabled();
  await medArende(page, "Extra kabelränna vid container");

  const { namn, sokvag } = await exportera(page, info);
  expect(namn).toMatch(/\.bcfzip$/);
  const zip = await JSZip.loadAsync(await readFile(sokvag));
  const filer = Object.keys(zip.files);
  expect(filer).toContain("bcf.version");
  const markup = filer.find((f) => f.endsWith("/markup.bcf"));
  expect(markup).toBeTruthy();
  const mapp = markup.replace("/markup.bcf", "");
  expect(filer).toContain(`${mapp}/viewpoint.bcfv`);
  expect(filer).toContain(`${mapp}/snapshot.png`);

  const xml = await zip.file(markup).async("string");
  expect(xml).toContain("Extra kabelränna vid container");
  expect(xml).toContain('TopicStatus="Open"');
  expect(xml).toContain("ata-nr:UR");
  const vp = await zip.file(`${mapp}/viewpoint.bcfv`).async("string");
  expect(vp).toContain("<PerspectiveCamera>");
  expect(vp).toContain("<AuthoringToolId>");

  // Skärmdumpen är en riktig PNG (magic bytes), inte tom.
  const png = await zip.file(`${mapp}/snapshot.png`).async("uint8array");
  expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.length).toBeGreaterThan(500);

  // Ärendet har fått sitt BCF-guid, så en import uppdaterar det i stället för att dubblera.
  await expect.poll(async () => ((await portfolj(page)).ur || []).find((u) => u.benamning === "Extra kabelränna vid container")?.bcfGuid).toBe(mapp);
});

test("importerar samma fil igen: uppdaterar, dubblerar inte, och en ändrad titel följer med", async ({ page }, info) => {
  await oppna(page, VY);
  await medArende(page, "Skadad dörr");
  const { sokvag } = await exportera(page, info);

  // Ändra titel och status i filen, som om en kollega redigerat ärendet i ett annat verktyg.
  const zip = await JSZip.loadAsync(await readFile(sokvag));
  const markup = Object.keys(zip.files).find((f) => f.endsWith("/markup.bcf"));
  const ny = (await zip.file(markup).async("string"))
    .replace("Skadad dörr", "Skadad dörr — åtgärdad &amp; kontrollerad")
    .replace('TopicStatus="Open"', 'TopicStatus="Closed"')
    .replace("ata-status:oppen", "ata-status:stangd");
  zip.file(markup, ny);
  await valjFil(page, "andrad.bcfzip", await zip.generateAsync({ type: "nodebuffer" }));
  await expect(page.getByText("0 nya ärenden, 1 uppdateras")).toBeVisible();
  await page.getByRole("button", { name: "Importera", exact: true }).click();

  await expect
    .poll(async () => ((await portfolj(page)).ur || []).filter((x) => x.bcfGuid).map((x) => `${x.benamning}|${x.status}`))
    .toEqual(["Skadad dörr — åtgärdad & kontrollerad|stangd"]);
  await expect(arenden(page).getByRole("listitem")).toHaveCount(1);
});

test("ett ärende från ett annat verktyg blir ett nytt ärende, kopplat till objektet och med kameravy", async ({ page }) => {
  await oppna(page, VY);
  await kort(page).getByRole("button", { name: "+ Container", exact: true }).click();
  await kort(page).getByRole("button", { name: "Placera mitt på tomten" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(async () => ((await portfolj(page)).siteObjekt || []).length).toBe(1);
  const objektId = (await portfolj(page)).siteObjekt[0].id;

  const guid = "5f2504e0-4f89-41d3-9a0c-0305e82c3303";
  const zip = new JSZip();
  zip.file("bcf.version", '<?xml version="1.0"?><Version VersionId="2.1"/>');
  zip.file(
    `${guid}/markup.bcf`,
    `<?xml version="1.0"?><Markup><Topic Guid="${guid}" TopicType="Hinder" TopicStatus="In Progress"><Title>Importerat från extern</Title><Description>Se bild</Description><CreationDate>2026-09-30T10:00:00Z</CreationDate><CreationAuthor>Kim</CreationAuthor><AssignedTo>Alex Young</AssignedTo></Topic><Viewpoints Guid="v1"><Viewpoint>viewpoint.bcfv</Viewpoint></Viewpoints><Comment Guid="c1"><Comment>Hej</Comment></Comment></Markup>`
  );
  zip.file(
    `${guid}/viewpoint.bcfv`,
    `<?xml version="1.0"?><VisualizationInfo Guid="v1"><Components><Selection><Component><AuthoringToolId>${objektId}</AuthoringToolId></Component></Selection></Components><PerspectiveCamera><CameraViewPoint><X>10</X><Y>-20</Y><Z>8</Z></CameraViewPoint><CameraDirection><X>0</X><Y>0.9</Y><Z>-0.3</Z></CameraDirection><CameraUpVector><X>0</X><Y>0</Y><Z>1</Z></CameraUpVector><FieldOfView>50</FieldOfView></PerspectiveCamera></VisualizationInfo>`
  );
  await valjFil(page, "extern.bcfzip", await zip.generateAsync({ type: "nodebuffer" }));
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("1 nya ärenden, 0 uppdateras, 1 kopplas till objekt.");
  await expect(dialog).toContainText("1 kommentarer läses inte in.");
  await page.getByRole("button", { name: "Importera", exact: true }).click();

  await expect(arenden(page).getByRole("listitem")).toHaveCount(1);
  await expect(arenden(page)).toContainText("Importerat från extern");
  await expect(arenden(page)).toContainText("Objekt: Container 1");
  await expect
    .poll(async () => ((await portfolj(page)).ur || []).find((u) => u.bcfGuid === guid))
    .toMatchObject({ klass: "hinder", status: "prissattning", objectGuid: objektId, ansvarig: "Alex Young", bcfBeskrivning: "Se bild", handelseDatum: "2026-09-30" });
  const u = ((await portfolj(page)).ur || []).find((x) => x.bcfGuid === guid);
  expect(u.boundingBox.min).toHaveLength(3);
  expect(u.viewpoint.fov).toBe(50);
  expect(u.viewpoint.cameraPosition).toEqual([10, 8, 20]);
});

test("en fil som inte är BCF ger ett tydligt fel och ändrar ingenting", async ({ page }) => {
  await oppna(page, VY);
  await valjFil(page, "fel.bcfzip", Buffer.from("det här är ingen zip"));
  await expect(page.getByText(/ingen giltig zip/)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(((await portfolj(page)).ur || []).filter((u) => u.bcfGuid)).toHaveLength(0);
});
