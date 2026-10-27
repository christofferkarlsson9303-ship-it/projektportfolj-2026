# bess-drift

Drift- och övervakningsgränssnitt för ONE Nordics batteriparker i driftskedet. Realtidsstatus park → container → PCS → modul → cell, larm med kvittering, driftlägen och historik.

Det är en egen app, skild från [`bess-dashboard/`](../bess-dashboard/) (EPC-uppföljning under byggskedet).

**Status 2026-10-27:** kravspec och arkitektur. Ingen kod än.

| Dokument | Innehåll |
| --- | --- |
| [docs/01-kravspec.md](docs/01-kravspec.md) | Syfte, roller, KPI:er, funktionella krav, wireframes |
| [docs/02-arkitektur.md](docs/02-arkitektur.md) | Stack, adapterlager, realtidsflöde, kommandon och säkerhet |
| [docs/03-datamodell.md](docs/03-datamodell.md) | Hierarki, signal-ID, TypeScript-typer, SQL-schema |
| [docs/04-sprintplan.md](docs/04-sprintplan.md) | Milstolpar M0–M4, sprintar S0–S8, Definition of Done, risker |
