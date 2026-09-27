/* Designsystemet — de komponenter som ger appen en röd tråd.

   Allt är Tailwind på designsystemets tokens (tailwind.config.js), så samma
   komponent är rätt i ljust och mörkt läge och följer ONE Nordics profil.
   Avstånd följer en 8 px-skala: gap-2/4/6, p-4/6. Nya vyer byggs av de här
   delarna i stället för egna klasser.

   Card            avgränsat kort med rubrik, underrubrik, märke och åtgärd
   StatusBadge     statuskapsel (forsenad, starta_nu, pagar, kommande, klar …)
   ProgressSummary framdrift: kontrollpunkter, hållpunkter och grindar
   LeadTimeList    åtgärdsrader med status, titel, datum och förskjutning
   DataList        nyckel–värde-rader i stället för löpande text
   SectionHeading  rubrik och ingress för en sektion utanför kort
   StatTile        nyckeltalsruta: etikett, tal och förklaring
   StatGroup       samma nyckeltal inuti ett kort, utan egen ram
   Callout         upplysningsruta för antaganden, rutiner och varningar
   Meter           mätare för andel av en helhet
   Overline        liten versal rubrik för ett avsnitt inuti ett kort
   CheckList       avbockningslista med kryssrutor */

export { Card } from "./Card.jsx";
export { StatusBadge } from "./StatusBadge.jsx";
export { ProgressSummary } from "./ProgressSummary.jsx";
export { LeadTimeList } from "./LeadTimeList.jsx";
export { DataList } from "./DataList.jsx";
export { SectionHeading } from "./SectionHeading.jsx";
export { StatTile } from "./StatTile.jsx";
export { StatGroup } from "./StatGroup.jsx";
export { Callout } from "./Callout.jsx";
export { Meter } from "./Meter.jsx";
export { Overline } from "./Overline.jsx";
export { CheckList } from "./CheckList.jsx";
