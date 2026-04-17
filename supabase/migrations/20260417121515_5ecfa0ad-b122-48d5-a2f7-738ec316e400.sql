insert into storage.buckets (id, name, public) values ('cvs', 'cvs', true) on conflict (id) do nothing;

create policy "cvs public read" on storage.objects for select using (bucket_id = 'cvs');
create policy "cvs public insert" on storage.objects for insert with check (bucket_id = 'cvs');
create policy "cvs public update" on storage.objects for update using (bucket_id = 'cvs');
create policy "cvs public delete" on storage.objects for delete using (bucket_id = 'cvs');

alter table public.profile add column if not exists cv_pdf_url text;
alter table public.profile add column if not exists cv_file_name text;