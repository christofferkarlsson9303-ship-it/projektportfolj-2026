# 03 · Datamodell och schema — bess-drift

Status: utkast 2026-10-27. SQL nedan är ett **förslag** och appliceras inte förrän sprint 1 är godkänd.

## 1. Hierarki

```
Park ─┬─ Anslutningspunkt (POC): P, Q, f, U, brytare
      ├─ Container (1..n) ─┬─ PCS/omriktare (1..n): status, P/Q, Udc, Idc, fel
      │                    ├─ HVAC, brandlarm, dörr, nödstopp
      │                    └─ Rack (1..n) ─ Modul (1..n) ─ Cell (1..n): V, T
      └─ Transformator (1..n): temperatur, last
```

- **Park, container, PCS och transformator** är rader i databasen (få, ändras sällan).
- **Rack, modul och cell** är **inte** rader. De beskrivs av containerns `topologi` (antal per nivå) och adresseras med signal-ID. Annars blir det 33 000 rader per park som aldrig ändras.

## 2. Signal-ID

Format: `{park}.{container}[.r{rack}[.m{modul}[.c{cell}]]].{mätstorhet}`

| Exempel | Betyder |
| --- | --- |
| `vxj.poc.p_mw` | Aktiv effekt vid anslutningspunkten, Växjö |
| `vxj.c06.soc_pct` | SoC, container 06 |
| `vxj.c06.pcs1.state` | PCS 1 i container 06, tillstånd |
| `vxj.c06.r3.m02.t_max_c` | Maxtemperatur modul 2, rack 3 |
| `vxj.c06.r3.m02.c05.v_mv` | Cellspänning, cell 5 |

Enhet ingår i namnet (`_mw`, `_pct`, `_c`, `_mv`). Inga omräkningar i UI.

## 3. Delade typer (`bess-drift/shared`)

```ts
import { z } from "zod";

export const Kvalitet = z.enum(["good", "stale", "bad", "sim"]);

export const Matvarde = z.object({
  id: z.string(),                 // signal-ID
  v: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  ts: z.string().datetime(),      // mättid i källan (UTC)
  q: Kvalitet,
});

export const TelemetryFrame = z.object({
  provider: z.string(),
  mottagen: z.string().datetime(), // gatewayns tid
  varden: z.array(Matvarde),
});

export const Driftlage = z.enum([
  "standby", "fcr_n", "fcr_d_upp", "fcr_d_ned", "arbitrage", "peak_shaving", "underhall",
]);

export const Prioritet = z.enum(["kritisk", "varning", "info"]);

export const LarmTillstand = z.enum([
  "aktiv_okvitterad", "aktiv_kvitterad", "atergatt_okvitterad", "normal", "shelvad",
]);

export const KommandoTyp = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("satt_lage"), lage: Driftlage }),
  z.object({ typ: z.literal("satt_soc_mal"), soc_pct: z.number().min(0).max(100) }),
  z.object({ typ: z.literal("satt_p_borvarde"), p_mw: z.number() }),
]);

export const CommandRequest = z.object({
  request_id: z.string().uuid(),  // idempotensnyckel från klienten
  park_id: z.string(),
  kommando: KommandoTyp,
  kommentar: z.string().max(500).optional(),
});

export const KommandoTillstand = z.enum([
  "begard", "bekraftad", "skickad", "kvitterad", "avvisad", "timeout",
]);

export type TelemetryFrame = z.infer<typeof TelemetryFrame>;
export type CommandRequest = z.infer<typeof CommandRequest>;
```

**Parkens SoC med täckning** (samma princip som `parkSumma()` i `bess-dashboard`):

```ts
export function parkSoc(containrar: { soc_pct: number | null; e_anv_mwh: number; q: string }[]) {
  const giltiga = containrar.filter((c) => c.q === "good" && c.soc_pct !== null);
  const eTot = giltiga.reduce((s, c) => s + c.e_anv_mwh, 0);
  if (eTot === 0) return { soc_pct: null, tackning: [0, containrar.length] as const };
  const eKvar = giltiga.reduce((s, c) => s + (c.soc_pct! / 100) * c.e_anv_mwh, 0);
  return { soc_pct: (eKvar / eTot) * 100, tackning: [giltiga.length, containrar.length] as const };
}
```

## 4. Relationsschema (Supabase)

```sql
-- Konfiguration --------------------------------------------------------------
create table park (
  id            text primary key,              -- 'vxj', 'avl'
  namn          text not null,
  p_nom_mw      numeric not null,
  e_nom_mwh     numeric not null,
  tidszon       text not null default 'Europe/Stockholm',
  skapad        timestamptz not null default now()
);

create table container (
  id            text primary key,              -- 'vxj-c06'
  park_id       text not null references park(id),
  nummer        int  not null,
  e_anv_mwh     numeric not null,              -- användbar energi vid SoH 100 %
  topologi      jsonb not null,                -- {"rack":8,"modul":8,"cell":52}
  unique (park_id, nummer)
);

create table pcs (
  id            text primary key,              -- 'vxj-c06-pcs1'
  container_id  text not null references container(id),
  p_nom_mw      numeric not null
);

-- Behörighet: roll per park --------------------------------------------------
create type drift_roll as enum ('viewer', 'operator', 'admin');

create table park_roll (
  user_id  uuid not null references auth.users(id),
  park_id  text not null references park(id),
  roll     drift_roll not null,
  primary key (user_id, park_id)
);

create function har_roll(p_park text, p_min drift_roll) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from park_roll
    where user_id = auth.uid() and park_id = p_park and roll >= p_min
  );
$$;

-- Larm ------------------------------------------------------------------------
create type larm_prio as enum ('kritisk', 'varning', 'info');
create type larm_tillstand as enum
  ('aktiv_okvitterad', 'aktiv_kvitterad', 'atergatt_okvitterad', 'normal', 'shelvad');

create table larm_definition (
  id            text primary key,              -- 'cell_dt_hog'
  prio          larm_prio not null,
  rubrik        text not null,
  villkor       jsonb not null,                -- {"signal":"*.t_delta_c",">":5,"for_s":30,"hysteres":0.5}
  atgard        text                           -- instruktion till operatör
);

create table larm (
  id            bigint generated always as identity primary key,
  park_id       text not null references park(id),
  definition_id text not null references larm_definition(id),
  kalla         text not null,                 -- signal-ID eller objekt, t.ex. 'vxj.c06.r3.m02'
  prio          larm_prio not null,
  tillstand     larm_tillstand not null,
  aktiverad     timestamptz not null,
  atergatt      timestamptz,
  kvitterad     timestamptz,
  kvitterad_av  uuid references auth.users(id),
  kommentar     text,
  shelvad_till  timestamptz,
  varde         numeric                        -- värdet vid aktivering
);
create index larm_aktiva on larm (park_id, prio) where tillstand <> 'normal';

-- Kvittering går bara via RPC, så att tid och användare sätts av servern.
create function kvittera_larm(p_larm bigint, p_kommentar text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_park text;
begin
  select park_id into v_park from larm where id = p_larm for update;
  if not har_roll(v_park, 'operator') then raise exception 'behorighet saknas' using errcode = '42501'; end if;
  update larm set
    kvitterad = now(), kvitterad_av = auth.uid(), kommentar = p_kommentar,
    tillstand = case tillstand
                  when 'aktiv_okvitterad'    then 'aktiv_kvitterad'::larm_tillstand
                  when 'atergatt_okvitterad' then 'normal'::larm_tillstand
                  else tillstand end
  where id = p_larm;
  insert into handelse (park_id, typ, user_id, data)
  values (v_park, 'larm_kvitterat', auth.uid(), jsonb_build_object('larm', p_larm, 'kommentar', p_kommentar));
end $$;

-- Kommandon -------------------------------------------------------------------
create type kommando_tillstand as enum
  ('begard', 'bekraftad', 'skickad', 'kvitterad', 'avvisad', 'timeout');

create table kommando (
  id            bigint generated always as identity primary key,
  request_id    uuid not null unique,          -- idempotens
  park_id       text not null references park(id),
  user_id       uuid not null references auth.users(id),
  roll          drift_roll not null,           -- roll vid tillfället
  typ           text not null,
  fore          jsonb,                         -- värde före
  efter         jsonb not null,                -- begärt värde
  tillstand     kommando_tillstand not null,
  orsak         text,                          -- vid avvisad/timeout
  skapad        timestamptz not null default now(),
  slutford      timestamptz
);

-- Händelselogg (append-only) --------------------------------------------------
create table handelse (
  id       bigint generated always as identity primary key,
  park_id  text references park(id),
  tid      timestamptz not null default now(),
  typ      text not null,                      -- larm_aktiv, larm_kvitterat, kommando, lage_bytt, inloggning
  user_id  uuid references auth.users(id),
  data     jsonb not null default '{}'
);
revoke update, delete on handelse from authenticated, anon;
```

**RLS (princip):** `select` på park/container/larm/kommando/handelse kräver `har_roll(park_id, 'viewer')`. Inga direkta `insert/update` från klienten på `larm`, `kommando` eller `handelse`. Gatewayn skriver med servicenyckel. Klienten kvitterar via `kvittera_larm()`.

## 5. Telemetri (fas 2, sprint 6)

```sql
create table telemetri (
  ts         timestamptz not null,
  signal_id  text        not null,
  v          double precision,
  q          smallint    not null            -- 0 good, 1 stale, 2 bad, 3 sim
);
-- TimescaleDB: select create_hypertable('telemetri', 'ts', chunk_time_interval => interval '1 day');
-- Utan TimescaleDB: partition by range (ts), en partition per dygn.
create index on telemetri (signal_id, ts desc);
```

**Lagring och upplösning [A]:**

| Nivå | Upplösning | Behålls |
| --- | --- | --- |
| Rådata park/container/PCS | 1–2 s | 30 dagar |
| Rådata modul min/max/medel | 5 s | 30 dagar |
| Rådata cell | 10 s (bara när loggning är på) | 7 dagar |
| Minutaggregat (min, max, medel, sista) | 1 min | 2 år |
| Timaggregat | 1 h | livslängd |
| Dygn: energi in/ut, EFC, RTE, tillgänglighet, SoH | 1 dygn | livslängd |

## 6. Kopplingen till bess-dashboard (senare)

En enda läsväg: `GET /api/sammanfattning?park=vxj` från gatewayn ger tillgänglighet (30 d), aktiva kritiska larm och SoH. `bess-dashboard` sparar ingenting av detta i `portfolj/state`; Idag-vyn läser det live och visar det grått om gatewayn inte svarar.
