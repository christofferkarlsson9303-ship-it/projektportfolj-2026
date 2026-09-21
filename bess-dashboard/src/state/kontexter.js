import { createContext } from "react";

/* Kontexterna ligger separat från providers så att Fast Refresh fungerar —
   en fil som exporterar både komponenter och annat tappar hot reload. */

export const PortfolioContext = createContext(null);
export const UiContext = createContext(null);
export const AuthContext = createContext(null);
