-- Run once after 001_asostech.sql. Adds persistent site content, workspace
-- settings, admin profile metadata support, and public project image storage.

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  company_name text not null default 'ASOSTECH',
  contact_email text not null default 'info@asostech.com',
  phone text not null default '',
  website text not null default '',
  address text not null default '',
  business_hours text not null default '',
  logo_url text not null default '',
  notifications jsonb not null default '{"New lead":true,"New quote":true,"New message":true,"Project updates":false,"Service publishing":true}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.website_content (
  section text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.website_content (section, content) values
  ('homepage', '{"eyebrow":"SMARTER SYSTEMS. SAFER SPACES.","title":"Advanced Electrical & Security Systems","description":"Reliable electrical, security and power solutions for homes, offices and modern spaces.","primary_cta":"Start a Conversation","secondary_cta":"Explore Services"}'::jsonb),
  ('about', '{"hero_title":"Powering spaces. Protecting what matters.","hero_description":"Practical electrical, security and power solutions for the places people live and work.","story_one":"ASOSTECH delivers reliable electrical, security and power solutions for homes, offices and modern spaces. Our work is grounded in practical thinking, careful installation and a clear understanding of how each system needs to perform in the real world.","story_two":"From an electrical repair to a new security installation or backup power solution, we help clients move from uncertainty to a setup they can rely on.","mission":"To deliver dependable systems that make everyday spaces safer, more connected and more resilient.","vision":"To be a trusted name for thoughtful electrical, security and power work."}'::jsonb),
  ('contact', '{"email":"info@asostech.com","phone":"","address":"","business_hours":""}'::jsonb),
  ('call_to_action', '{"title":"Let’s build a safer, smarter space.","description":"Need electrical work, security installation, CCTV, alarm systems or solar/inverter solutions? We’re ready to help.","button":"Start a Conversation"}'::jsonb)
on conflict (section) do nothing;

alter table public.site_settings enable row level security;
alter table public.website_content enable row level security;

revoke all on public.site_settings, public.website_content from anon, authenticated;
grant select on public.site_settings, public.website_content to anon, authenticated;
grant insert, update, delete on public.site_settings, public.website_content to authenticated;

drop policy if exists "Site settings are public" on public.site_settings;
create policy "Site settings are public" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "ASOSTECH admins manage site settings" on public.site_settings;
create policy "ASOSTECH admins manage site settings" on public.site_settings
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Website content is public" on public.website_content;
create policy "Website content is public" on public.website_content
  for select to anon, authenticated using (true);
drop policy if exists "ASOSTECH admins manage website content" on public.website_content;
create policy "ASOSTECH admins manage website content" on public.website_content
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
drop trigger if exists website_content_set_updated_at on public.website_content;
create trigger website_content_set_updated_at before update on public.website_content
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-media', 'project-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Project images are public" on storage.objects;
create policy "Project images are public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'project-media');
drop policy if exists "ASOSTECH admins upload project images" on storage.objects;
create policy "ASOSTECH admins upload project images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-media' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "ASOSTECH admins update project images" on storage.objects;
create policy "ASOSTECH admins update project images" on storage.objects
  for update to authenticated
  using (bucket_id = 'project-media' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'project-media' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "ASOSTECH admins delete project images" on storage.objects;
create policy "ASOSTECH admins delete project images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-media' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
