/** Escapar jokertecknen i ett ILIKE-mönster (\\, %, _), så att en
 *  skiftlägesokänslig jämförelse blir exakt. Används vid behörighetsuppslaget:
 *  en adress med _ eller % fick annars träffa andra adresser. */
export function exaktIlike(text) {
  return String(text).replace(/[\\%_]/g, (t) => "\\" + t);
}
