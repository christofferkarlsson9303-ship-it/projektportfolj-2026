/* Supabase-delen av F05: RPC och läsning. Utan Supabase (lokalt läge) finns ingen
   server att kvittera mot – då returnerar funktionerna null. */

import { supabase } from "../lib/supabase.js";

/** @param {import("../lib/godkannanden.js").Kvittens} k */
export async function registreraGodkannande(k) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("registrera_godkannande", {
    p_projekt_id: k.projektId,
    p_typ: k.typ,
    p_objekt_id: k.objektId,
    p_varde: k.varde,
    p_utford_av: k.utfordAv || null,
  });
  if (error) {
    const e = new Error(error.message);
    // @ts-ignore
    e.code = error.code;
    throw e;
  }
  return data;
}

/** Senaste kvittens per objekt i projektet. Map objektId → rad. */
export async function hamtaGodkannanden(projektId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("godkannanden")
    .select("id, typ, objekt_id, varde, utford_av, kvitterad_epost, kvitterad_tid")
    .eq("projekt_id", projektId)
    .order("kvitterad_tid", { ascending: false });
  if (error) throw error;
  const ut = new Map();
  for (const r of data || []) if (!ut.has(r.objekt_id)) ut.set(r.objekt_id, r);
  return ut;
}
