# Figma-plugin: ONE P Kanbantavla med ÄTA

Ritar en tavla med fyra kolumner och exempelkort som instanser av komponenterna *Kort / Uppgift* och *Kort / ÄTA*.

1. Figma → Plugins → Development → Import plugin from manifest… → `manifest.json`.
2. Kör *ONE P – Kanbantavla med ÄTA*.
3. Ändra utseendet på komponenterna (de ligger till höger om tavlan) så ändras alla kort.

Källa: `code.ts`. `code.js` är kompilerad (`npx tsc code.ts --ignoreConfig --target ES2017 --lib ES2017 --noCheck`). För typkontroll: `npm i -D @figma/plugin-typings typescript` och `npx tsc -p .`.

`kanban.svg` är samma tavla som ritning utan instanser, för att dra in direkt på canvasen. Exempelkorten är påhittade.
