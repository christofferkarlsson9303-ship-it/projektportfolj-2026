/* Montörens lista i klartext (beslut 2026-10-27): en tioåring ska förstå
   vad som ska göras.

   Per moment: en rubrik, när man börjar, var man jobbar och stegen i den
   ordning de görs på plats. Varje steg pekar på en kontrollrad i
   projektchecklistan (`id`) och visas med den radens nummer (12.19a).
   Kraven står kvar i egenkontrollen och i Bygga batteripark; här står bara
   det montören gör.

   Regler för texterna:
   - kort rubrik som börjar med ett verb
   - en mening per rad, högst fem rader
   - inga förkortningar som montören inte ser på utrustningen
   - `matt` när något ska skrivas ned (värde och enhet)
   - `stopp` när montören ska vänta på arbetsledarens underskrift

   Kontrollrader som saknas här är projektledarens (ta emot kvittenser,
   samordna leverantörsprov) och kommer inte med på montörens lista.
   Moment 12: P12.01, M2.09, M3.09, M3.10, M3.11 och M3.12.

   Värdena (50/60 Nm, plintmoment, 60 Ω) kommer från projektledarens
   sammanställning av CATL- och PE-manualerna och är inte kontrollerade mot
   originalen. Samma värden står i checklistan (12.2, 12.20) och
   egenkontrollerna. */

/** @typedef {{ id: string, titel: string, gor: string[], matt?: string, stopp?: boolean }} MontorSteg */
/** @typedef {{ rubrik: string, borja: string, var: string, steg: MontorSteg[] }} MontorMoment */

/** @type {Record<number, MontorMoment>} */
export const MONTOR = {
  12: {
    rubrik: "Koppla in batterier och växelriktare",
    borja: "Batterier, växelriktare och skid står fast och är jordade.",
    var: "Batteri­containrar (CATL), växelriktare (PCS) och MV-skid.",
    steg: [
      { id: "B.02", titel: "Läs skylten på växelriktaren", stopp: true, gor: [
        "Står det PCSK eller PCSM? Då ska inga säkringar sättas i DC-facket.",
        "Står det något annat? Sluta och ring arbetsledaren.",
      ] },
      { id: "M2.04", titel: "Mät att det är spänningslöst", stopp: true, gor: [
        "Bara behörig elmontör.",
        "Lås och märk enligt arbetsberedningen.",
        "Mät DC+ och DC− med godkänt instrument.",
        "Visar det inte 0 V? Rör ingenting. Ring arbetsledaren.",
      ], matt: "Uppmätt: ____ V   Var: ______________" },
      { id: "B.03", titel: "Dra DC-kablarna", gor: [
        "Ta bort de två skyddsplåtarna i batteriets skenutrymme först.",
        "Följ kabellistan, från batteriet till växelriktaren.",
        "Böj inte kablarna skarpt. Högst två kablar per anslutning.",
        "Bocka av varje kabel i kabellistan.",
        "Sätt tillbaka skyddsplåtarna efteråt, 10 Nm.",
      ] },
      { id: "M2.03", titel: "Kolla plus och minus", gor: [
        "Plus (+) till plus. Minus (−) till minus.",
        "Jämför med kopplingsschemat och märkningen.",
      ] },
      { id: "M2.07", titel: "Använd rätt kabelskor", gor: [
        "Förtennade kabelskor.",
        "Kabelskon ska vara större än brickan.",
      ] },
      { id: "M2.08", titel: "Lägg brickorna i rätt ordning", gor: [
        "Torka kontaktytorna rena med isopropanol.",
        "Följ bilden i manualen för just den anslutningen.",
      ] },
      { id: "M2.05", titel: "Dra åt med momentnyckel", gor: [
        "Använd kalibrerad momentnyckel.",
        "Vid batteriet: 50 Nm. Vid växelriktaren: 60 Nm.",
        "Skriv värdet för varje bult i momentprotokollet.",
      ] },
      { id: "M2.06", titel: "Måla streck på bultarna", gor: [
        "Dra ett streck med momentlack över bult och mutter.",
        "Bara på bultar du har momentdragit.",
      ] },
      { id: "M2.13", titel: "Fäst kablarna", gor: [
        "Fäst alla kraft-, signal- och jordkablar med klammer.",
        "Inga lösa kablar.",
      ] },
      { id: "M2.14", titel: "Täta hålen", gor: [
        "Täta alla kabelhål med brandkitt.",
        "Ta ett foto av varje hål.",
      ] },
      { id: "M2.01", titel: "Koppla 230 V till plint XT0", gor: [
        "Dra åt plinten till 0,6–0,8 Nm, eller enligt plintens märkning.",
        "Mät spänningen.",
      ], matt: "Uppmätt: ____ V" },
      { id: "M2.02", titel: "Koppla 400 V till plint XT1", gor: [
        "Dra åt plinten till 3,2–3,7 Nm.",
        "Mät spänningen mellan faserna. Kolla att fasföljden är rätt.",
      ], matt: "L1–L2 ____ V   L2–L3 ____ V   L1–L3 ____ V" },
      { id: "M3.01", titel: "Koppla fiber och nätverkskabel", gor: [
        "Följ nätverksritningen, mellan containrarna och till växelriktaren.",
      ] },
      { id: "M3.02", titel: "Koppla CAN-kablarna", gor: [
        "Följ kommunikationsritningen.",
      ] },
      { id: "M3.03", titel: "Kolla CAN-H och CAN-L", gor: [
        "CAN-H och CAN-L får inte förväxlas.",
        "Märk båda.",
      ] },
      { id: "M3.04", titel: "Mät CAN-nätet", gor: [
        "Kolla att ändmotstånden (120 Ω) sitter på plats.",
        "Mät hela nätet. Det ska vara ungefär 60 Ω.",
      ], matt: "Uppmätt: ____ Ω" },
      { id: "M3.05", titel: "Koppla JX5 stift 1 och 2", gor: [
        "Följ kopplingsschemat.",
      ] },
      { id: "M3.06", titel: "Koppla nödstoppet (JX5 stift 3 och 4)", gor: [
        "Följ kopplingsschemat.",
        "Nödstoppet provas senare, tillsammans med provledaren.",
      ] },
      { id: "M3.07", titel: "Jorda AC-utrustningen", gor: [
        "Anslut till huvudjordskenan enligt jordningsritningen.",
      ] },
      { id: "M3.08", titel: "Jorda DC-utrustningen", gor: [
        "Anslut till huvudjordskenan enligt jordningsritningen.",
      ] },
      { id: "M2.10", titel: "Mät plus mot chassit", gor: [
        "Bara behörig elmontör. Reläer och frånskiljare ska vara öppna.",
        "Värdet ska vara över 1 MΩ.",
      ], matt: "Uppmätt: ____ MΩ" },
      { id: "M2.11", titel: "Mät minus mot chassit", gor: [
        "Bara behörig elmontör. Reläer och frånskiljare ska vara öppna.",
        "Värdet ska vara över 1 MΩ.",
      ], matt: "Uppmätt: ____ MΩ" },
      { id: "M2.12", titel: "Mät plus mot minus", gor: [
        "Bara behörig elmontör. Reläer och frånskiljare ska vara öppna.",
        "Värdet ska vara över 1 MΩ.",
      ], matt: "Uppmätt: ____ MΩ" },
      { id: "P12.02", titel: "Lämna över till provning", stopp: true, gor: [
        "Lämna momentprotokoll, mätvärden och foton till arbetsledaren.",
        "Skriv ned det som inte är klart.",
      ], matt: "Inte klart: ________________________________" },
    ],
  },
};
