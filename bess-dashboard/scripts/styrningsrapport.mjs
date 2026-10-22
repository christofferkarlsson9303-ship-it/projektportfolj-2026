// Skriver docs/sa-styr-appen-projektet.md ur src/data/styrningsrapport.js.
// Kör: npm run docs:styrning
import { writeFileSync } from "node:fs";
import { rapportTillMarkdown } from "../src/data/styrningsrapport.js";

const fil = new URL("../docs/sa-styr-appen-projektet.md", import.meta.url);
writeFileSync(fil, rapportTillMarkdown());
console.log("Skrev", fil.pathname);
