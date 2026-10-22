-- Behörighetsprov med simulerade JWT-claims. Inte ett inloggnings-/API-prov.
-- Alla provdata och no-op-skrivningar rullas tillbaka. Inga projektvärden ändras.
-- Kör hela filen som postgres. Resultatet innehåller inga kontouppgifter.
begin;
create temporary table audit_results(roll text, prov text, godkant boolean, detalj text) on commit drop;
grant select, insert on audit_results to anon, authenticated;
do $$ declare v_claim jsonb; v_mail text := 'behorighetsprov-' || gen_random_uuid()::text || '@exempel.invalid'; begin
  select jsonb_build_object('sub',u.id,'email',u.email,'role','authenticated') into v_claim
  from auth.users u join public.allowed_users a on lower(a.email)=lower(u.email) where a.role='admin' limit 1;
  if v_claim is null then raise exception 'En verklig admin krävs som underlag'; end if;
  perform set_config('audit.admin',v_claim::text,true);
  insert into public.allowed_users(email,role) values(v_mail,'montor');
  perform set_config('audit.montor',jsonb_build_object('sub',gen_random_uuid(),'email',v_mail,'role','authenticated')::text,true);
  perform set_config('audit.blocked',jsonb_build_object('sub',gen_random_uuid(),'email','ej-tillaten@exempel.invalid','role','authenticated')::text,true);
end $$;
set local role anon;
do $$ declare n integer; ok boolean; begin
  perform set_config('request.jwt.claims','{}',true);
  begin
    select count(*) from public.app_state where key='portfolj/state' into n;
    insert into audit_results values('anonym','lasa portfolj',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('anonym','lasa portfolj',not false,'42501');
  end;
  begin
    with x as (update public.app_state set value=value where key='portfolj/state' returning key) select count(*) from x into n;
    insert into audit_results values('anonym','uppdatera portfolj',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('anonym','uppdatera portfolj',not false,'42501');
  end;
  begin
    with x as (update public.app_state set value=value where key='portfolj/ekonomi' returning key) select count(*) from x into n;
    insert into audit_results values('anonym','uppdatera ekonomi',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('anonym','uppdatera ekonomi',not false,'42501');
  end;
  begin
    with x as (insert into public.app_state(key,value) values('behorighetsprov-anonym','{}'::jsonb) returning key) select count(*) from x into n;
    insert into audit_results values('anonym','skapa egen provrad',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('anonym','skapa egen provrad',not false,'42501');
  end;
  begin
    perform public.reservera_paminnelser('[]'::jsonb,1);
    insert into audit_results values('anonym','intern RPC nekas',false,'RPC var anropbar');
  exception when insufficient_privilege then
    insert into audit_results values('anonym','intern RPC nekas',true,'42501');
  end;
  insert into audit_results values('anonym','TRUNCATE saknas',not has_table_privilege(current_user,'public.app_state','TRUNCATE'),'grants-kontroll, inget TRUNCATE utförs');
end $$;
reset role;
set local role authenticated;
do $$ declare n integer; ok boolean; begin
  perform set_config('request.jwt.claims',current_setting('audit.blocked'),true);
  begin
    select count(*) from public.app_state where key='portfolj/state' into n;
    insert into audit_results values('ej_tillaten','lasa portfolj',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('ej_tillaten','lasa portfolj',not false,'42501');
  end;
  begin
    with x as (update public.app_state set value=value where key='portfolj/state' returning key) select count(*) from x into n;
    insert into audit_results values('ej_tillaten','uppdatera portfolj',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('ej_tillaten','uppdatera portfolj',not false,'42501');
  end;
  begin
    with x as (update public.app_state set value=value where key='portfolj/ekonomi' returning key) select count(*) from x into n;
    insert into audit_results values('ej_tillaten','uppdatera ekonomi',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('ej_tillaten','uppdatera ekonomi',not false,'42501');
  end;
  begin
    with x as (insert into public.app_state(key,value) values('behorighetsprov-ej_tillaten','{}'::jsonb) returning key) select count(*) from x into n;
    insert into audit_results values('ej_tillaten','skapa egen provrad',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('ej_tillaten','skapa egen provrad',not false,'42501');
  end;
  begin
    perform public.reservera_paminnelser('[]'::jsonb,1);
    insert into audit_results values('ej_tillaten','intern RPC nekas',false,'RPC var anropbar');
  exception when insufficient_privilege then
    insert into audit_results values('ej_tillaten','intern RPC nekas',true,'42501');
  end;
  insert into audit_results values('ej_tillaten','TRUNCATE saknas',not has_table_privilege(current_user,'public.app_state','TRUNCATE'),'grants-kontroll, inget TRUNCATE utförs');
end $$;
reset role;
set local role authenticated;
do $$ declare n integer; ok boolean; begin
  perform set_config('request.jwt.claims',current_setting('audit.montor'),true);
  begin
    select count(*) from public.app_state where key='portfolj/state' into n;
    insert into audit_results values('montor','lasa portfolj',(n>0)=true,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('montor','lasa portfolj',not true,'42501');
  end;
  begin
    with x as (update public.app_state set value=value where key='portfolj/state' returning key) select count(*) from x into n;
    insert into audit_results values('montor','uppdatera portfolj',(n>0)=true,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('montor','uppdatera portfolj',not true,'42501');
  end;
  begin
    with x as (update public.app_state set value=value where key='portfolj/ekonomi' returning key) select count(*) from x into n;
    insert into audit_results values('montor','uppdatera ekonomi',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('montor','uppdatera ekonomi',not false,'42501');
  end;
  begin
    with x as (insert into public.app_state(key,value) values('behorighetsprov-montor','{}'::jsonb) returning key) select count(*) from x into n;
    insert into audit_results values('montor','skapa egen provrad',(n>0)=false,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('montor','skapa egen provrad',not false,'42501');
  end;
  begin
    perform public.reservera_paminnelser('[]'::jsonb,1);
    insert into audit_results values('montor','intern RPC nekas',false,'RPC var anropbar');
  exception when insufficient_privilege then
    insert into audit_results values('montor','intern RPC nekas',true,'42501');
  end;
  insert into audit_results values('montor','TRUNCATE saknas',not has_table_privilege(current_user,'public.app_state','TRUNCATE'),'grants-kontroll, inget TRUNCATE utförs');
end $$;
reset role;
set local role authenticated;
do $$ declare n integer; ok boolean; begin
  perform set_config('request.jwt.claims',current_setting('audit.admin'),true);
  begin
    select count(*) from public.app_state where key='portfolj/state' into n;
    insert into audit_results values('admin','lasa portfolj',(n>0)=true,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('admin','lasa portfolj',not true,'42501');
  end;
  begin
    with x as (update public.app_state set value=value where key='portfolj/state' returning key) select count(*) from x into n;
    insert into audit_results values('admin','uppdatera portfolj',(n>0)=true,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('admin','uppdatera portfolj',not true,'42501');
  end;
  begin
    with x as (update public.app_state set value=value where key='portfolj/ekonomi' returning key) select count(*) from x into n;
    insert into audit_results values('admin','uppdatera ekonomi',(n>0)=true,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('admin','uppdatera ekonomi',not true,'42501');
  end;
  begin
    with x as (insert into public.app_state(key,value) values('behorighetsprov-admin','{}'::jsonb) returning key) select count(*) from x into n;
    insert into audit_results values('admin','skapa egen provrad',(n>0)=true,n::text || ' rader');
  exception when insufficient_privilege then
    insert into audit_results values('admin','skapa egen provrad',not true,'42501');
  end;
  begin
    perform public.reservera_paminnelser('[]'::jsonb,1);
    insert into audit_results values('admin','intern RPC nekas',false,'RPC var anropbar');
  exception when insufficient_privilege then
    insert into audit_results values('admin','intern RPC nekas',true,'42501');
  end;
  insert into audit_results values('admin','TRUNCATE saknas',not has_table_privilege(current_user,'public.app_state','TRUNCATE'),'grants-kontroll, inget TRUNCATE utförs');
end $$;
reset role;
select * from audit_results order by roll,prov;
rollback;
