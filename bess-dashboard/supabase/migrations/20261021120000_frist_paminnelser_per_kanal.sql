-- Påminnelser per kanal med lås och återförsök (granskning F07).
-- APPLICERAD 2026-10-22 i produktion (projektportfolj, eu-north-1), sats för sats. Se docs/behorighetsprov-2026-10-22.md.
-- Driftsätt därefter Edge Function frist-paminnelser (index.ts anropar funktionerna nedan).
--
-- Beslut 2026-10-21: alla kanaler måste lyckas. Varje (frist, nivå, revision, kanal)
-- har egen status: sending (reserverad, lås till last_till), sent, failed.
-- revision är fristens grund (händelsedatumet); ändras den påminns fristen på nytt.
-- Befintliga rader blir kanal 'alla' med status sent och räknas som skickade på alla kanaler.

alter table public.frist_paminnelser
  add column revision   text        not null default '',
  add column kanal      text        not null default 'alla',
  add column status     text        not null default 'sent' check (status in ('sending', 'sent', 'failed')),
  add column forsok     integer     not null default 1,
  add column last_till  timestamptz,
  add column fel        text,
  add column uppdaterad timestamptz not null default now();

alter table public.frist_paminnelser drop constraint frist_paminnelser_pkey;
alter table public.frist_paminnelser add primary key (nyckel, niva, revision, kanal);

-- Reserverar de rader som får skickas nu och returnerar dem. En rad får tas när den
-- saknas, när förra försöket misslyckades (högst 12 försök) eller när ett lås gått ut.
-- En gammal rad med kanal 'alla' och status sent spärrar alla kanaler för samma frist.
create or replace function public.reservera_paminnelser(p_rader jsonb, p_las_sekunder integer)
returns table (nyckel text, niva text, revision text, kanal text)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
declare
  r jsonb;
  v_nyckel text; v_niva text; v_revision text; v_kanal text;
begin
  for r in select * from jsonb_array_elements(p_rader) loop
    v_nyckel := r->>'nyckel'; v_niva := r->>'niva'; v_revision := coalesce(r->>'revision', ''); v_kanal := r->>'kanal';

    if exists (
      select 1 from public.frist_paminnelser f
      where f.nyckel = v_nyckel and f.niva = v_niva and f.kanal = 'alla' and f.status = 'sent'
    ) then
      continue;
    end if;

    insert into public.frist_paminnelser as f (nyckel, niva, revision, kanal, status, forsok, last_till, uppdaterad)
    values (v_nyckel, v_niva, v_revision, v_kanal, 'sending', 1, now() + make_interval(secs => p_las_sekunder), now())
    on conflict on constraint frist_paminnelser_pkey do update
      set status = 'sending',
          forsok = f.forsok + 1,
          last_till = now() + make_interval(secs => p_las_sekunder),
          uppdaterad = now()
      where (f.status = 'failed' and f.forsok < 12)
         or (f.status = 'sending' and f.last_till < now());

    if found then
      nyckel := v_nyckel; niva := v_niva; revision := v_revision; kanal := v_kanal;
      return next;
    end if;
  end loop;
end;
$$;

create or replace function public.markera_paminnelser(p_rader jsonb, p_status text, p_fel text default null)
returns void
language sql
set search_path = public
as $$
  update public.frist_paminnelser f
     set status = p_status,
         fel = case when p_status = 'failed' then p_fel else null end,
         last_till = null,
         uppdaterad = now()
    from jsonb_array_elements(p_rader) r
   where f.nyckel = r->>'nyckel' and f.niva = r->>'niva'
     and f.revision = coalesce(r->>'revision', '') and f.kanal = r->>'kanal';
$$;

-- Bara Edge Function (service-nyckeln) anropar funktionerna.
revoke all on function public.reservera_paminnelser(jsonb, integer) from public, anon, authenticated;
revoke all on function public.markera_paminnelser(jsonb, text, text) from public, anon, authenticated;
