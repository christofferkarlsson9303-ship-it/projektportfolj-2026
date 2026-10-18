/* Id för nya rader. Slumpad, inte tidsbaserad: två rader som skapas samma
   millisekund (snabba klick, två användare, import) får aldrig samma id, och
   sammanfoga() slår ihop rader med samma id. Prefixet gör id:t läsbart. */
export function nyttId(prefix = "") {
  const slump =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  return prefix + slump;
}
