import { KATALOG } from "../data/projektstartKatalog.js";

/** Kontrollpunkter för en guidesida, med avbockning ur utkastet. Ett steg kan
 *  begränsa en katalog till vissa grupper (`grupper`), så att garanti och
 *  slutbesiktning kan ligga på varsin sida men dela katalog. */
export const stegPunkter = (steg) =>
  (steg.katalog || []).flatMap((b) =>
    KATALOG[b]
      .filter((p) => !steg.grupper?.[b] || steg.grupper[b].includes(p.grupp))
      .map((p) => ({ ...p, bucket: b })),
  );

export const arAvbockad = (u, p) => !!u.kryss?.[p.bucket]?.[p.id];
