import { createContext } from "react";

/* Kontexterna ligger separat från providers så att Fast Refresh fungerar —
   en fil som exporterar både komponenter och annat tappar hot reload. */

export const PortfolioContext = createContext(null);
/** Bara åtgärderna (dispatch och de enkla hjälparna). Värdet byts inte när
 *  portföljen ändras, så en komponent som bara skriver renderas inte om. */
export const PortfolioAtgardContext = createContext(null);
export const UiContext = createContext(null);
export const AuthContext = createContext(null);
