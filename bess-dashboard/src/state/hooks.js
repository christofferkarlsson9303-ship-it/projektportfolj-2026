import { useContext } from "react";
import { AuthContext, PortfolioAtgardContext, PortfolioContext, UiContext } from "./kontexter.js";

export function usePortfolj() {
  const v = useContext(PortfolioContext);
  if (!v) throw new Error("usePortfolj måste användas inuti <PortfolioProvider>");
  return v;
}

/** Åtgärderna utan portföljdatan. Använd i rader och knappar som bara skriver
 *  — de renderas då inte om vid varje ändring i portföljen (React.memo hjälper
 *  inte en komponent som läser usePortfolj()). */
export function usePortfoljAtgarder() {
  const v = useContext(PortfolioAtgardContext);
  if (!v) throw new Error("usePortfoljAtgarder måste användas inuti <PortfolioProvider>");
  return v;
}

export function useUi() {
  const v = useContext(UiContext);
  if (!v) throw new Error("useUi måste användas inuti <UiProvider>");
  return v;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth måste användas inuti <AuthProvider>");
  return v;
}
