import { useContext } from "react";
import { PortfolioContext, UiContext } from "./kontexter.js";

export function usePortfolj() {
  const v = useContext(PortfolioContext);
  if (!v) throw new Error("usePortfolj måste användas inuti <PortfolioProvider>");
  return v;
}

export function useUi() {
  const v = useContext(UiContext);
  if (!v) throw new Error("useUi måste användas inuti <UiProvider>");
  return v;
}
