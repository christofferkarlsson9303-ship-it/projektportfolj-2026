/* Kör hela migreringskedjan i en Postgres i minnet (PGlite) och provar
   poster-tabellen: överföringen från portföljdokumentet, versioner, historik
   och behörighetsreglerna — som inloggad användare, inte som ägare, så att
   RLS faktiskt gäller.

   Det som bara finns i Supabase (auth.jwt(), rollerna, storage, realtids-
   publiceringen) stubbas här med samma beteende. */

import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MAPP = join(import.meta.dirname, "..", "migrations");
const POSTER = "20260929190000_poster_rad_per_post.sql";

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
  $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.jwt() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  create publication supabase_realtime;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
  create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text);
  alter table storage.objects enable row level security;
`;

const PORTFOLJ = {
  projekt: [
    { id: "36037", namn: "Växjö Batteripark" },
    { id: "36038", namn: "Alvesta Batteripark" },
  ],
  risker: [
    { id: "r1", projektId: "36037", titel: "Trafo", status: "oppen" },
    { id: "r2", projektId: "36038", titel: "Mark", status: "oppen" },
  ],
  rutinstatus: [{ projektId: "36037", punkt: "vecka.1", klar: true }],
  dagbok: [],
};

let db;

/** Kör fn som inloggad med given e-post (null = anonym JWT utan e-post). */
async function som(epost, fn) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(epost ? { email: epost } : {})]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

const rader = async (sql, p) => (await db.query(sql, p)).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const filer = readdirSync(MAPP).filter((f) => f.endsWith(".sql")).sort();
  for (const f of filer) {
    if (f === POSTER) {
      // Befintligt läge innan migreringen: portföljen som ett dokument.
      await db.query("insert into public.app_state (key, value) values ('portfolj/state', $1)", [PORTFOLJ]);
      await db.query("insert into public.allowed_users (email, role) values ('pl@one.se', 'admin'), ('montor@one.se', 'montor')");
    }
    await db.exec(readFileSync(join(MAPP, f), "utf8"));
  }
}, 60_000);

describe("överföringen från portföljdokumentet", () => {
  it("varje element blir en rad med lista, id, ordning och projekt", async () => {
    const r = await rader("select lista, id, projekt_id, ordning from public.poster order by lista, ordning");
    expect(r).toEqual([
      { lista: "projekt", id: "36037", projekt_id: null, ordning: 0 },
      { lista: "projekt", id: "36038", projekt_id: null, ordning: 1 },
      { lista: "risker", id: "r1", projekt_id: "36037", ordning: 0 },
      { lista: "risker", id: "r2", projekt_id: "36038", ordning: 1 },
      { lista: "rutinstatus", id: "rs-36037-vecka.1", projekt_id: "36037", ordning: 0 },
    ]);
  });

  it("datan är oförändrad och varje rad har en första historikversion", async () => {
    const [r] = await rader("select data, version from public.poster where lista='risker' and id='r1'");
    expect(r).toEqual({ data: PORTFOLJ.risker[0], version: 1 });
    const h = await rader("select operation, version, av from public.poster_historik where lista='risker' and id='r1'");
    expect(h).toEqual([{ operation: "skapad", version: 1, av: "migrering" }]);
  });

  it("portföljdokumentet ligger kvar orört som reserv", async () => {
    const [r] = await rader("select value from public.app_state where key='portfolj/state'");
    expect(r.value).toEqual(PORTFOLJ);
  });
});

describe("versioner och historik", () => {
  it("en ändring räknar upp versionen, sätts i användarens namn och loggas", async () => {
    const [ut] = await som("montor@one.se", () =>
      rader(
        `update public.poster set data = data || '{"status":"stangd"}'::jsonb
          where lista='risker' and id='r1' and version=1 returning version, uppdaterad_av`
      )
    );
    expect(ut).toEqual({ version: 2, uppdaterad_av: "montor@one.se" });
    const h = await rader(
      "select operation, version, av, data->>'status' as status from public.poster_historik where lista='risker' and id='r1' order by version"
    );
    expect(h.at(-1)).toEqual({ operation: "andrad", version: 2, av: "montor@one.se", status: "stangd" });
  });

  it("fel version ändrar ingenting (optimistisk låsning)", async () => {
    const ut = await som("montor@one.se", () =>
      rader(`update public.poster set data = '{"id":"r1"}' where lista='risker' and id='r1' and version=1 returning id`)
    );
    expect(ut).toEqual([]);
  });

  it("klienten kan inte sätta avsändare eller version själv", async () => {
    const [ut] = await som("montor@one.se", () =>
      rader(
        `update public.poster set uppdaterad_av='nagon@annan.se', version=99, data = data || '{"x":1}'::jsonb
          where lista='risker' and id='r2' returning version, uppdaterad_av`
      )
    );
    expect(ut).toEqual({ version: 2, uppdaterad_av: "montor@one.se" });
  });

  it("bara ordningsbyte ger ingen historikrad", async () => {
    const fore = await rader("select count(*)::int n from public.poster_historik where lista='projekt' and id='36037'");
    await som("pl@one.se", () => db.exec("update public.poster set ordning = 5 where lista='projekt' and id='36037'"));
    const efter = await rader("select count(*)::int n from public.poster_historik where lista='projekt' and id='36037'");
    expect(efter[0].n).toBe(fore[0].n);
  });

  it("borttagning är mjuk och syns i historiken; delete gör ingenting", async () => {
    await som("pl@one.se", () =>
      db.exec("update public.poster set borttagen = true where lista='projekt' and id='36038'")
    );
    const h = await rader(
      "select operation from public.poster_historik where lista='projekt' and id='36038' order by version desc limit 1"
    );
    expect(h[0].operation).toBe("borttagen");

    await som("pl@one.se", () => db.exec("delete from public.poster where lista='risker' and id='r2'"));
    expect(await rader("select id from public.poster where lista='risker' and id='r2'")).toHaveLength(1);
  });

  it("återställd post loggas som återställd", async () => {
    await som("pl@one.se", () =>
      db.exec("update public.poster set borttagen = false where lista='projekt' and id='36038'")
    );
    const h = await rader(
      "select operation from public.poster_historik where lista='projekt' and id='36038' order by version desc limit 1"
    );
    expect(h[0].operation).toBe("aterstalld");
  });

  it("en ny post får version 1 och en skapad-rad", async () => {
    await som("pl@one.se", () =>
      db.exec(`insert into public.poster (lista, id, data, version) values ('dagbok', 'd1', '{"id":"d1","projektId":"36038"}', 7)`)
    );
    const [r] = await rader("select version, projekt_id from public.poster where lista='dagbok' and id='d1'");
    expect(r).toEqual({ version: 1, projekt_id: "36038" });
  });
});

describe("behörighet", () => {
  it("den som inte finns på listan ser ingenting", async () => {
    const r = await som("okand@example.com", () => rader("select * from public.poster"));
    expect(r).toEqual([]);
    const h = await som("okand@example.com", () => rader("select * from public.poster_historik"));
    expect(h).toEqual([]);
  });

  it("den som inte finns på listan kan inte skapa eller ändra", async () => {
    await expect(
      som("okand@example.com", () =>
        db.exec(`insert into public.poster (lista, id, data) values ('risker', 'x', '{"id":"x"}')`)
      )
    ).rejects.toThrow(/row-level security/);
    const ut = await som("okand@example.com", () =>
      rader(`update public.poster set data='{"id":"r1"}' where lista='risker' and id='r1' returning id`)
    );
    expect(ut).toEqual([]);
  });

  it("historiken går inte att skriva, ändra eller radera", async () => {
    await expect(
      som("pl@one.se", () =>
        db.exec(
          `insert into public.poster_historik (lista, id, version, operation, data) values ('risker','r1',9,'andrad','{}')`
        )
      )
    ).rejects.toThrow(/row-level security/);
    const fore = await rader("select count(*)::int n from public.poster_historik");
    await som("pl@one.se", async () => {
      await db.exec("update public.poster_historik set av = 'falsk'");
      await db.exec("delete from public.poster_historik");
    });
    const efter = await rader("select count(*)::int n, count(*) filter (where av='falsk')::int f from public.poster_historik");
    expect(efter[0]).toEqual({ n: fore[0].n, f: 0 });
  });

  it("anonym utan e-post ser ingenting", async () => {
    const r = await som(null, () => rader("select * from public.poster"));
    expect(r).toEqual([]);
  });
});
