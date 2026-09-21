import { useCallback, useEffect, useMemo, useState } from "react";
import { KONFIGURERAD, supabase } from "../lib/supabase.js";
import { AuthContext } from "./kontexter.js";

/* Inloggning med magisk länk. Behörigheten läses ur allowed_users i stället för
   via rpc is_allowed() — select på den tabellen är ändå gated av samma regel,
   och då kan EXECUTE på hjälpfunktionerna dras in utan att appen slutar
   fungera.

   status: "okonfigurerad" | "laddar" | "utloggad" | "inloggad" */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState(KONFIGURERAD ? "laddar" : "okonfigurerad");
  const [session, setSession] = useState(null);
  // Slagningen bär med sig vilken adress den gäller, så att behörigheten kan
  // härledas under render i stället för att nollställas i en effekt.
  const [slagning, setSlagning] = useState({ epost: "", tillaten: false, admin: false });

  useEffect(() => {
    if (!supabase) return;
    let avbruten = false;

    supabase.auth.getSession().then(({ data }) => {
      if (avbruten) return;
      setSession(data.session ?? null);
      setStatus(data.session ? "inloggad" : "utloggad");
    });

    const { data: lyssnare } = supabase.auth.onAuthStateChange((_handelse, ny) => {
      setSession(ny ?? null);
      setStatus(ny ? "inloggad" : "utloggad");
    });

    return () => {
      avbruten = true;
      lyssnare.subscription.unsubscribe();
    };
  }, []);

  // Slå upp rollen när någon loggat in. Tom träff = inte på listan.
  useEffect(() => {
    const epost = session?.user?.email;
    if (!supabase || !epost) return;
    let avbruten = false;

    (async () => {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("email, role")
        .ilike("email", epost)
        .maybeSingle();

      if (avbruten) return;
      setSlagning({
        epost,
        tillaten: !error && !!data,
        admin: !error && data?.role === "admin",
      });
    })();

    return () => {
      avbruten = true;
    };
  }, [session]);

  const skickaLank = useCallback(async (epost) => {
    if (!supabase) throw new Error("Supabase är inte konfigurerat");
    const { error } = await supabase.auth.signInWithOtp({
      email: epost.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const loggaUt = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  const epost = session?.user?.email || "";
  // Bara giltig när slagningen gjordes för den adress som är inloggad nu.
  const aktuell = slagning.epost && slagning.epost === epost;

  const api = useMemo(
    () => ({
      status,
      epost,
      // Falskt tills allowlistan svarat för just den här adressen — annars
      // hinner grinden visa "saknar behörighet" innan svaret är inne.
      kontrollerad: !!aktuell,
      tillaten: !!aktuell && slagning.tillaten,
      admin: !!aktuell && slagning.admin,
      skickaLank,
      loggaUt,
    }),
    [status, epost, aktuell, slagning, skickaLank, loggaUt]
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}
