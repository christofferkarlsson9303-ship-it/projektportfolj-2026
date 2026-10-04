# Byggorder — för in prototypen i den här appen

Du är i `bess-dashboard` på grenen `snabbutskrift`. Dokumentationen ligger redan här. Läs den och bygg sedan. Planera inte en runda till.

Läs i ordning:

1. `CLAUDE.md` i repots rot
2. `bess-dashboard/CLAUDE.md`
3. `bess-dashboard/docs/prototyp-36037.md`
4. `src/sections/Idag.jsx`, inklusive kommentaren överst
5. `src/components/tidplan/KritiskLinje.jsx` och `src/lib/kritiskLinje.js`
6. `src/components/field/SnabbUtskrift.jsx` och `src/lib/planering.js`
7. ÄTA-vyn och ÄTA-postens form i reducern, innan du lägger fält

Prototypen från 2026-10-04 ska in i den här Vite-appen: tidomen på Idag, ÄTA-radkalkyl på befintligt ärende, gåbar site. Koden från prototypen ska inte in. Den är TanStack, zustand och localStorage. Beteendet i specen ska in.

## Hårda regler

- Byt inte ut `kritiskLinje`, `KritiskLinje`, `SnabbUtskrift`, `DataTable`, `byggFaltmaterial` eller portföljens JSONB-schema.
- Skriv inte in 36037, ÄTA-012 eller Lag A–C i en riktig portfölj. Seedet i specen är en skärmdump, inte data.
- Lägg inget av det här som fler commits på `snabbutskrift`. PR 28 ska kunna mergas som den är.
- Tre grenar från `snabbutskrift`, i den här ordningen. Varje gren en PR mot `main`. Nästa gren utgår från föregående först när den är grön.
  1. `idag-brygga`
  2. `ata-kalkyl`
  3. `site-3d`
- Nya bibliotek bara på `site-3d`, och då bara `three`. Inte `@react-three/fiber`, inte `drei`, inte ett UI-kit.
- Svenska. Inga emojis. Inga nya hex-färger. Designsystemet i `src/components/ds/` gäller på ljusa ytor.
- Papper är vitt även i mörkt läge, med ONE-logotyp och sidnummer, via den printväg som redan finns. Inget eget `window.print()` vid sidan av `#utskrift`.
- Efter varje gren: `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e` utan `.env.local`. `e2e/snabbutskrift.spec.js` ska gå igenom på alla tre.

## 1. idag-brygga

Idag ska svara på två frågor utan att bli två produkter. Bandet svarar på om vi blir klara i tid. Listan under svarar på vad som ska göras nu. Listan är redan bra. Låt `Grupp`, `Arbetsrad`, `Lista`, horisont, frister och det tomma läget med `CircleCheck` vara, med samma typstorlekar.

För valt projekt, `kritiskLinje(state, pid, idag())`. Räkna inte om.

Bandet som redan är `bg-one-djup`, `rounded-xl`:

- Overline, 12px, bold, uppercase, tracking-wider, `text-white/80`: ”Blir vi klara i tid”. Till höger `StatusBadge`. I tid → ton `ok`. Sent → ton `bad` och texten ”N dagar sent”. Saknade datum → ton `warn`, ”Uppgifter saknas”. Bandet förblir `one-djup` även när det är sent. Märket bär läget, inte ytan.
- Projektnummer och namn, 18–20px, vitt. Inte 42px.
- En mening, 14px, `text-white/80`. Sent: dagarna och att de kritiska faserna flyttar slutbesiktningen. I tid: slutbesiktningen i klartext. Saknade datum: ”Ange start och slut på projektet.”
- Tre tal under `border-t border-white/15` och `sm:divide-x sm:divide-white/15`. Etikett 11px uppercase tracking-wider `text-white/70`. Värde `text-2xl font-bold tabular-nums` vitt.
  - Beräknad slutbesiktning → `k.slutPrognos`
  - Mot ursprunglig plan → `k.motBaslinje`, eller ”—”. Detail då: ”Ingen baslinje”, plus en textlänk ”Spara på tidplanen” som bara öppnar tidplan.
  - Styr slutdatumet → antal faser med `kritisk`. Detail: ”av N faser”.
- Bygg talen i bandet. Inte `StatTile`. Inte `StatGroup`. `StatTile` är ett vitt kort. `StatGroup` använder `text-ink` och syns inte på `one-djup`.
- Under talen, bara faserna som styr: textlänkar 13px, vita, åtskilda med ” · ”. Klick gör det tidplanstabellen redan gör, `oppnaPost("epc", "fas-N")`. Inga sexton piller. Ingen progressbar.
- Dagens antal ”saker kräver din åtgärd” sjunker från 42px till `text-2xl` och blir en fjärde avdelning på `lg`, egen rad på smal skärm. Dess `StatusBadge` (lugn / bevaka / frist passerad) står kvar vid det talet. Två märken: ett för kontraktet, ett för dagen.

Saknas start eller slut: bandet står kvar med tankstreck, plus samma `Callout` som `KritiskLinje`. Inga fejkade datum.

Skriv ut arbetslista på öppen punkt med utförare via `useSnabbUtskrift().arbetslista(pid, { utforare })`. Raden ska fortfarande vara en träffyta. Tom lista ger den toast som redan finns. ÄTA under utredning öppnar posten, inte en ny kalkyl.

Ingen situationsplan på Idag i den här grenen.

Tester: domen kommer från motorn. Utan datum blir det tankstreck. Sent projekt har `bad`-märke och `one-djup` yta. Arbetslista skriver till `#utskrift` utan dialog.

## 2. ata-kalkyl

På befintlig vy `ata`, på ett befintligt ÄTA-nummer. ”Öppna i kalkyl” från registret fyller nr och titel. Spara skriver beloppet tillbaka på posten. Raderna ligger på posten om den inte redan har rader. Ingen ny `localStorage`-nyckel. Ingen ny JSONB-rad. Läs reducern innan du lägger fält, och lägg bara det som saknas.

Formel, per rad:

```text
summa = antal × á-pris × (1 + övertidProcent / 100) × (1 + påslagProcent / 100)
```

- Arbete och maskin: övertid 0, 50 eller 100. Påslag 0.
- Fordon, km: inget tillägg.
- Material och UE: antal är faktisk kostnad i kronor, á-pris 1, påslag 10. Det är ABT 06 kap. 6 § 9, samma regel som fakturaunderlaget.
- Moms 25 visas. Att betala = netto + moms.
- Övertid 50 är faktor 1,5 och 100 är faktor 2. Tidrapportens faktor 3 rör du inte. Är raden tid ur tidrapporten: använd tidslaget där, inte ett andra procentfält. Procenten är för kalkylen på avin.

Slå upp á-pris i `planering.js`, personer och resurser först. Listan i `docs/prototyp-36037.md` är bara startvärde när resursen saknar pris. Döp inte om poster som finns.

Yta: chips, högst fyra första resurserna per kategori, plus en tom rad. Enter i beskrivning lägger en rad med samma resurs. Tal högerställda, `tabular-nums`. Netto, moms och att betala i en summering, inte utspritt i kort. Inget ikon-galleri.

CSV: semikolon, UTF-8 BOM, kolumner Datum, Beskrivning, Resurs, Antal, ÖT %, Påslag %, Summa.

Avi: samma print/PDF-väg som fältmaterialet. Logotyp, ÄTA-nr, projekt, beställare, orsak, rader, netto, moms, två signaturrader (ONE Nordic och beställare). Menyer skrivs inte ut.

Tester: en rad montör 2 × 945 utan övertid är 1 890. Material 10 000 är 11 000 före moms. Sparat belopp syns på ÄTA-posten efter omladdning av state.

## 3. site-3d

Egen PR. Först här får `three` läggas till.

En vy för valt projekt. Tomt 80 × 52 m. Orbit tills användaren går in. Utan situationsplan: grus och körytor, modellen syns ändå.

Volymer och nålar hör till projektet i `portfolj/state`, som vanliga fält ni redan mergar i `sammanfoga.js`. Inte en egen store. Återställ sätter tillbaka ett tomt läge för det projektet, inte en hårdkodad 36037-park. Specens mått är mallarna när användaren lägger till, inte en import:

- skid och container 6,1 × 2,5 × 2,9 m
- E-House 12 × 3,2 × 3,4 m
- trafo 3,2 × 2,6 × 2,6 m
- också låda och nål

Klick på marken placerar. Markerat objekt kan dras, döpas, få bredd, djup, höjd och rotation, och tas bort. Nålen pekar på en punkt i `punkter` via id, så arbetslistan i PR 28 fortfarande träffar rätt uppgift. Ingen lös text som inte är en punkt.

Gång, inte fordon. `three`, högerhänt, +Y upp. `yaw` 0 tittar mot −Z. Framåt `(−sin yaw, 0, −cos yaw)`. Höger `(cos yaw, 0, −sin yaw)`. W fram, S bak, A strafe vänster, D höger. Shift springer. Q upp, E ner. Mus tittar: `yaw −= movementX`, `pitch −= movementY`. Piltangenter som WASD. Kollision mot volymens låda i lokal rotation, marginal ca 0,45 m. Blockerat steg stannar.

Situationsplan: användaren väljer bild, anger bredd i meter och norr i grader. Djupet följer bildens proportion. Bilden är marktextur. Spara den inte i `portfolj/state` och inte som data-URL i JSONB. `sessionStorage` räcker. Synken får inte ta med den.

Mobil: joystick nere till vänster, minst 44 px. Knappar för Orbit och Gå in.

När volymerna finns i state: på Idag, under bandet och ovanför listan, en toppvy som ritas från samma volymer. Inte en dekorationsbild. Klick öppnar siten. Saknas volymer visas rutan inte.

Tester som inte kräver WebGL: A är vänster relativt blickriktningen, bilden skrivs inte in i state-objektet som synkas, en nål utan punkt-id kan inte sparas.

## Klart

Tre PR:er. Idag visar domen från motorn och skriver ut arbetslista via hooken. Ett ÄTA-ärende kan räkna rader, spara beloppet och skriva ut avi. Siten går att gå i, A strafe:ar vänster, och situationsplanen ligger utanför JSONB. Tidplantabellen är orörd. PR 28:s diff för utskrift är orörd.
