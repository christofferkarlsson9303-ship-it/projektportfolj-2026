-- Ritningar i 3D-vyn: filerna i den privata bucketen "ritningar".
--
-- Metadata och placering (namn, skala, x/z, rotation) ligger i app_state som
-- siteRitningar, så ingen egen tabell behövs. Bucketen håller bara filen,
-- under sökvägen <projektId>/<id>-<filnamn>.
--
-- Behörighet följer protokollarkivet: inloggade på allowed_users läser och
-- laddar upp; borttagning är förbehållen administratören.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ritningar', 'ritningar', false, 52428800,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "allowed las ritningar" on storage.objects
  for select to authenticated using (bucket_id = 'ritningar' and (select public.is_allowed()));

create policy "allowed ladda upp ritningar" on storage.objects
  for insert to authenticated with check (bucket_id = 'ritningar' and (select public.is_allowed()));

create policy "admin ta bort ritningar" on storage.objects
  for delete to authenticated using (bucket_id = 'ritningar' and (select public.is_admin()));
