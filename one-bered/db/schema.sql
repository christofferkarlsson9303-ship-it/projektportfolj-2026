-- ONE Bered – datamodell (PostgreSQL 15+)
-- Multi-tenant: alla affärstabeller har org_id och skyddas med Row Level Security.
-- Belopp i SEK exkl. moms, numeric(14,2). Timmar numeric(10,3).

create extension if not exists pgcrypto;

-- ============ Organisation & behörighet ============
create table org (
  id uuid primary key default gen_random_uuid(),
  namn text not null,
  orgnr text,
  created_at timestamptz not null default now()
);

create table person (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  signatur text not null,                -- Guru: användarsignatur
  namn text not null,
  epost text,
  roll text not null check (roll in ('admin','projektledare','beredare','projektor','montor','ekonomi','lasare')),
  internkostnad_h numeric(10,2),         -- överstyr standardtimpris
  aktiv boolean not null default true,
  unique (org_id, signatur)
);

create table omrade (                     -- Guru: ansvarsområde / utförande område
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  kod text not null, namn text not null,
  unique (org_id, kod)
);

create table kund (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  namn text not null, orgnr text, fakturaadress text, peppol_id text,
  betalvillkor_dagar int not null default 30
);

-- ============ Kalkylkataloger (EBR KLG P1/P2/P3 + egna) ============
create table katalog (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references org(id),        -- null = branschkatalog delad av alla (licens krävs)
  namn text not null,                     -- 'KLG 1:26'
  niva text not null check (niva in ('P1','P2','P3','P5','EGEN')),
  giltig_ar int not null,
  timpris_bered numeric(10,2), timpris_mont numeric(10,2), timpris_maskin numeric(10,2),
  last boolean not null default false     -- låst när kalkyler refererar till den
);

create table kalkylkod (
  id uuid primary key default gen_random_uuid(),
  katalog_id uuid not null references katalog(id),
  arbkod text not null, lopnr text not null,
  kod text generated always as (arbkod || '.' || lopnr) stored,
  grupp text, benamning text not null, enhet text not null,
  bered_h numeric(10,3), mont_h numeric(10,3), maskin_h numeric(10,3), antal_man numeric(4,1),
  arbete_kr numeric(14,2), material_kr numeric(14,2), maskin_kr numeric(14,2), ovrigt_kr numeric(14,2), summa_kr numeric(14,2),
  kommentar text, tidsunderlag text,
  unique (katalog_id, arbkod, lopnr)
);

create table frekvens (                    -- konvertering P1→P2, P2→P3
  fran_kod_id uuid not null references kalkylkod(id),
  till_kod_id uuid not null references kalkylkod(id),
  antal_per_enhet numeric(12,4) not null,
  primary key (fran_kod_id, till_kod_id)
);

-- ============ Materiel ============
create table leverantor (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  namn text not null, kundnr_hos_lev text, orderadress text,
  edi_typ text check (edi_typ in ('epost','peppol','edi','api')),
  sortering int not null default 0
);

create table artikel (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  leverantor_id uuid references leverantor(id),
  enr text,                               -- E-nummer
  levart text,                            -- leverantörens artikelnr
  benamning text not null, enhet text not null,
  bruttopris numeric(14,2), nettopris numeric(14,2), nettomarkt boolean not null default false,
  lin_kabel boolean not null default false, diameter_mm numeric(6,1), vikt_kg_m numeric(6,2),
  typ text check (typ in ('stolpe','transformator','kabelskap','sats','dc','mv','lsp','opto','kontroll','jord','ovrigt')),
  bestallarlevererat boolean not null default false,  -- BL: battericontainer, MV-skid, EMS
  priskalla text,                                     -- t.ex. 'Grossistnetto', 'KLG 153.20 ÷3', 'Offert'
  giltig_fran date, giltig_till date
);
create index on artikel (org_id, enr);

create table artikel_ersattning (          -- Guru: ersättningslista mellan leverantörer
  artikel_id uuid references artikel(id), ersatt_av_id uuid references artikel(id), faktor numeric(8,3) default 1,
  primary key (artikel_id, ersatt_av_id)
);

-- ============ Konstruktionsstandard ============
create table konstruktionsgrupp (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  namn text not null, sortering int default 0,
  falt_namn text[] not null default '{}',        -- upp till 6 undergruppsrubriker
  ident_namn text[] not null default '{}'        -- t.ex. {'Grupp nr','Skåp nr'}
);

create table konstruktion (
  id uuid primary key default gen_random_uuid(),
  grupp_id uuid not null references konstruktionsgrupp(id),
  kod text not null, benamning text not null, sortering int default 0,
  parametrar jsonb not null default '[]'          -- parameterdriven konstruktion (längd, kabeltyp ...)
);

create table konstruktion_val (                    -- alternativ inom undergrupp
  id uuid primary key default gen_random_uuid(),
  konstruktion_id uuid not null references konstruktion(id),
  falt_index int not null, kod text not null, benamning text not null, kopplad boolean not null default true
);

create table konstruktion_materiel (
  id uuid primary key default gen_random_uuid(),
  konstruktion_id uuid not null references konstruktion(id),
  val_id uuid references konstruktion_val(id),
  artikel_id uuid not null references artikel(id),
  antal numeric(12,3) not null,                   -- 0 = alternativ
  antal_formel text                                -- t.ex. 'langd*1.03'
);

create table konstruktion_kod (
  id uuid primary key default gen_random_uuid(),
  konstruktion_id uuid not null references konstruktion(id),
  val_id uuid references konstruktion_val(id),
  kalkylkod_id uuid not null references kalkylkod(id),
  antal numeric(12,4) not null, antal_formel text  -- t.ex. 'langd/1000'
);

-- ============ Plan & projekt ============
create table projekt (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  pnr text not null, delnr text,                   -- Guru: 8 siffror + 3 delnummer
  forelder_id uuid references projekt(id),
  typ text not null default 'tillfalligt' check (typ in ('tillfalligt','fast')),
  benamning text not null, ort text,
  omrade_id uuid references omrade(id), kund_id uuid references kund(id), refnr_bestallare text,
  projektor_id uuid references person(id), beredare_id uuid references person(id), arbetsansvarig_id uuid references person(id),
  debitering text not null default 'fast' check (debitering in ('fast','lopande')),
  kontraktssumma numeric(14,2) default 0,
  fardiggrad numeric(5,2) default 0,
  bess jsonb,                                       -- {mw, mwh, hardvaruprofil, antal_container, antal_skid, radialer}
  status text not null default 'upplagt' check (status in ('upplagt','pagaende','avslutat')),
  avslutat_datum date, konto jsonb,               -- kontodelar mot ekonomisystemet
  created_at timestamptz not null default now(),
  unique (org_id, pnr, delnr)
);

create table tidlage (
  id uuid primary key default gen_random_uuid(),
  projekt_id uuid not null references projekt(id) on delete cascade,
  aktivitet text not null, start date, slut date, anm text,
  uppdaterad_av uuid references person(id), uppdaterad timestamptz default now()
);

create table dagbok (
  id uuid primary key default gen_random_uuid(),
  projekt_id uuid not null references projekt(id) on delete cascade,
  datum date not null, text text not null, timmar numeric(6,2), km numeric(8,1),
  skapad_av uuid references person(id)
);

create table dokument (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  agare_typ text not null, agare_id uuid not null,  -- projekt, beredningskonstruktion, tidläge ...
  filnamn text not null, storage_path text not null, skapad timestamptz default now()
);

-- ============ Kalkyl ============
create table kalkyl (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  nr text not null, projekt_id uuid references projekt(id),
  katalog_id uuid not null references katalog(id),
  benamning text not null,
  status text not null default 'alt' check (status in ('huv','alt','uf')),
  tidsfaktor numeric(6,3) not null default 1,
  pas_arbete numeric(6,2) default 0, pas_material numeric(6,2) default 0, pas_maskin numeric(6,2) default 0, pas_ovrigt numeric(6,2) default 0,
  risk_pct numeric(6,2) default 0, vinst_pct numeric(6,2) default 0,
  material_kalla text not null default 'katalog' check (material_kalla in ('katalog','beredning','bada')),
  beredning_id uuid,
  aktiv boolean not null default true,
  unique (org_id, nr)
);
create unique index one_uf_per_projekt on kalkyl (projekt_id) where status = 'uf';

create table kalkylrad (
  id uuid primary key default gen_random_uuid(),
  kalkyl_id uuid not null references kalkyl(id) on delete cascade,
  kalkylkod_id uuid references kalkylkod(id),       -- null = egen kod
  egen jsonb,                                       -- {benamning,enhet,bered_h,mont_h,maskin_h,material,ovrigt}
  antal numeric(14,4) not null, matris int not null default 1,
  markning text, anm text, intern_kommentar text,
  fri_overstyrning jsonb,                           -- frikalkyl: överstyrda timmar/priser
  check (kalkylkod_id is not null or egen is not null)
);

-- ============ Beredning ============
create table beredning (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  nr text not null, projekt_id uuid unique references projekt(id),  -- en beredning per (del)projekt
  leverantor_id uuid references leverantor(id),
  utfardare_id uuid references person(id),
  last_av uuid references person(id), last_tid timestamptz,          -- ersätter Guru "låsta beredningar"
  unique (org_id, nr)
);
alter table kalkyl add constraint kalkyl_beredning_fk foreign key (beredning_id) references beredning(id);

create table upplag (
  id uuid primary key default gen_random_uuid(),
  beredning_id uuid not null references beredning(id) on delete cascade,
  nr int not null, adress text, anm_till_grossist text,
  unique (beredning_id, nr)
);

create table beredning_konstruktion (
  id uuid primary key default gen_random_uuid(),
  beredning_id uuid not null references beredning(id) on delete cascade,
  konstruktion_id uuid not null references konstruktion(id),
  ordning int not null,
  parametrar jsonb not null default '{}',
  identitet jsonb not null default '{}',          -- {ledningsdel, stolpnr} / {grupp, skapnr} / fri
  anlaggning_ref text, kartref text,
  upplag_id uuid references upplag(id), kombination int,
  anm text
);

create table bk_materiel (
  id uuid primary key default gen_random_uuid(),
  bk_id uuid not null references beredning_konstruktion(id) on delete cascade,
  artikel_id uuid not null references artikel(id),
  antal numeric(12,3) not null, text_till_bestallning text, manuell boolean not null default false
);

create table bk_kod (
  id uuid primary key default gen_random_uuid(),
  bk_id uuid not null references beredning_konstruktion(id) on delete cascade,
  kalkylkod_id uuid not null references kalkylkod(id),
  antal numeric(14,4) not null, manuell boolean not null default false
);

create table schaktstracka (                       -- Guru kap 8.5 schaktprotokoll
  id uuid primary key default gen_random_uuid(),
  beredning_id uuid not null references beredning(id) on delete cascade,
  fran text, till text, langd_m numeric(10,1) not null,
  forlaggningssatt text, schaktprofil text, markforhallande text, utford boolean default false
);

-- Kabellista (BESS): genereras från beredningskonstruktioner, numreras per serie
create table kabel (
  id uuid primary key default gen_random_uuid(),
  beredning_id uuid not null references beredning(id) on delete cascade,
  bk_id uuid references beredning_konstruktion(id) on delete set null,
  serie text not null check (serie in ('HSP','DC','LSP','OPTO','KONTROLL')),  -- HSP 1–200, DC 201–500 (förslag), LSP 2001–, OPTO 4001–, KONTROLL 5001–
  nr int not null, fran text not null, till text not null,
  artikel_id uuid references artikel(id), antal_parter int not null default 1, langd_m numeric(10,1) not null,
  forlaggning text, spanning_typ text,
  belastning_a numeric(8,1), kapacitet_a numeric(8,1), reduktionsfaktor numeric(4,2),
  unique (beredning_id, serie, nr)
);

-- ============ Inköp ============
create table bestallning (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  nr text not null, projekt_id uuid not null references projekt(id), beredning_id uuid references beredning(id),
  leverantor_id uuid not null references leverantor(id), upplag_id uuid references upplag(id),
  leveransdatum date,
  status text not null default 'skapad' check (status in ('skapad','skickad','bekraftad','dellevererad','levererad','makulerad')),
  skickad timestamptz, unique (org_id, nr)
);
create table bestallningsrad (
  id uuid primary key default gen_random_uuid(),
  bestallning_id uuid not null references bestallning(id) on delete cascade,
  artikel_id uuid not null references artikel(id),
  antal numeric(12,3) not null, levererat numeric(12,3) default 0, pris numeric(14,2) not null, text text
);

-- ============ Tid & kostnad ============
create table tidrad (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  projekt_id uuid not null references projekt(id), person_id uuid not null references person(id),
  datum date not null, roll text not null check (roll in ('bered','mont','maskin')),
  timmar numeric(6,2) not null, fran time, till time, kommentar text,
  attesterad_av uuid references person(id), attesterad timestamptz,
  faktura_id uuid
);

create table kostnad (                              -- Guru: kostnadsregistrering
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  projekt_id uuid not null references projekt(id),
  datum date not null, leverantor text, typ text not null check (typ in ('ue','maskin','materiel','ovrigt')),
  belopp numeric(14,2) not null, text text, extern_ref text,   -- verifikat i ekonomisystemet
  faktura_id uuid
);

-- ============ ÄTA & fakturering ============
create table ata (
  id uuid primary key default gen_random_uuid(),
  projekt_id uuid not null references projekt(id),
  nr text not null, beskrivning text not null, belopp numeric(14,2) not null default 0,
  typ text not null default 'tillagg' check (typ in ('andring','tillagg','avgaende')),
  status text not null default 'begard' check (status in ('begard','godkand','avslagen')),
  begard date, beslutad date, beslutad_av text, faktura_id uuid,
  unique (projekt_id, nr)
);

create table fakturaplan (
  id uuid primary key default gen_random_uuid(),
  projekt_id uuid not null references projekt(id),
  milstolpe text not null, datum date, procent numeric(5,2), belopp numeric(14,2), faktura_id uuid
);

create table faktura (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id),
  nr text not null, projekt_id uuid not null references projekt(id), kund_id uuid references kund(id),
  datum date not null, forfallodatum date not null,
  netto numeric(14,2) not null, moms numeric(14,2) not null,
  status text not null default 'utkast' check (status in ('utkast','skickad','betald','makulerad','kreditfaktura')),
  extern_ref text, unique (org_id, nr)
);
create table fakturarad (
  id uuid primary key default gen_random_uuid(),
  faktura_id uuid not null references faktura(id) on delete cascade,
  text text not null, antal numeric(12,3) not null, enhet text, apris numeric(14,2) not null,
  kalla_typ text, kalla_id uuid                       -- tidrad / kostnad / ata / fakturaplan
);
alter table tidrad  add constraint tidrad_faktura_fk  foreign key (faktura_id) references faktura(id);
alter table kostnad add constraint kostnad_faktura_fk foreign key (faktura_id) references faktura(id);
alter table ata     add constraint ata_faktura_fk     foreign key (faktura_id) references faktura(id);
alter table fakturaplan add constraint plan_faktura_fk foreign key (faktura_id) references faktura(id);

-- ============ Spårbarhet ============
create table handelselogg (
  id bigserial primary key, org_id uuid not null, person_id uuid, tabell text not null, rad_id uuid not null,
  handelse text not null, data jsonb, tid timestamptz not null default now()
);

-- ============ Exempel: RLS-mönster (upprepas för alla tabeller med org_id) ============
alter table projekt enable row level security;
create policy projekt_org on projekt
  using (org_id = (current_setting('app.org_id'))::uuid)
  with check (org_id = (current_setting('app.org_id'))::uuid);
