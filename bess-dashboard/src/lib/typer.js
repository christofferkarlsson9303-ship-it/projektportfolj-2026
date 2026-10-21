/* Delade JSDoc-typer för kärnposterna (granskning #74). Filen innehåller ingen kod;
   den importeras som typ: @param {import("./typer.js").Kontrollpost} r */

/**
 * En registrerad egenkontroll för en punkt i en omfattning (enhet).
 * @typedef {object} Kontrollpost
 * @property {string} id              kontrollId(projektId, omfattning, punktId)
 * @property {""|"ok"|"ej-ok"|"ej-tillamplig"} resultat
 * @property {string} datum           ÅÅÅÅ-MM-DD, valideras med arGiltigtDatum()
 * @property {string} kontrollant
 * @property {string} referens        bevis eller protokollreferens
 * @property {string} [notering]      krävs vid "ej-tillamplig"
 * @property {string} mallrevision
 * @property {string} [omfattning]
 */

/**
 * Hur parkens SoC är räknad. SoC är manuellt inmatad, aldrig telemetri.
 * @typedef {object} SocUnderlag
 * @property {null|"medel"|"delvis"|"energiviktad"} metod
 * @property {number} medSoc          containrar med SoC angiven
 * @property {number} viktade         av dem, med MWh angiven
 * @property {number} utanKapacitet
 * @property {number} containrar      alla containrar på siten
 * @property {"manuell"} kalla
 */

/**
 * @typedef {object} ParkSumma
 * @property {number} mwh
 * @property {number} mw
 * @property {number} inverterMw
 * @property {number} trafoMva
 * @property {number|null} soc        null vid delvis underlag – visa grunden i stället
 * @property {SocUnderlag} socUnderlag
 * @property {number} antal
 * @property {number} driftsatta
 */

/**
 * Resultat av en trevägssammanslagning.
 * @typedef {object} Sammanslagning
 * @property {any} varde
 * @property {string[]} konflikter    sökvägar där båda ändrat olika
 */

/**
 * En synkoperation: en sparning av portföljen som väntar på kvittens (förenklad kö, F03).
 * @typedef {object} Synkoperation
 * @property {boolean} osparat        lokala ändringar som databasen inte kvitterat
 * @property {string|null} senastBekraftad  ISO-tid för senaste kvitterade sparning
 * @property {number} forsok          återförsök sedan senaste kvittens
 * @property {string|null} fel        senaste felmeddelande
 */

export {};
