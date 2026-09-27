create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  number text not null default '',
  short text not null default '',
  title text not null,
  description text not null default '',
  subtitle text not null default '',
  icon text not null default 'Zap',
  image text not null default '',
  items text[] not null default '{}',
  benefits text[] not null default '{}',
  process text[] not null default '{}',
  status text not null default 'Published' check (status in ('Published', 'Draft')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  location text not null default '',
  image text not null default '',
  description text not null default '',
  status text not null default 'Published' check (status in ('Published', 'Draft')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'General',
  question text not null,
  answer text not null,
  status text not null default 'Published' check (status in ('Published', 'Draft')),
  sort_order integer not null default 0,
  constraint faqs_category_question_key unique (category, question),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  whatsapp text,
  service_required text not null default 'General enquiry',
  project_type text,
  project_details text not null,
  status text not null default 'New' check (status in ('New', 'Reviewing', 'Contacted', 'Quoted', 'Completed', 'Archived')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  source text not null default 'website' check (source in ('website', 'quote')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services
  for each row execute function public.set_updated_at();
drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
drop trigger if exists faqs_set_updated_at on public.faqs;
create trigger faqs_set_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.faqs enable row level security;
alter table public.leads enable row level security;

revoke all on public.services, public.projects, public.faqs, public.leads from anon, authenticated;
grant select on public.services, public.projects, public.faqs to anon, authenticated;
grant insert, update, delete on public.services, public.projects, public.faqs to authenticated;
grant select, update, delete on public.leads to authenticated;

create policy "Published services are public" on public.services
  for select to anon, authenticated using (status = 'Published');
create policy "ASOSTECH admins manage services" on public.services
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Published projects are public" on public.projects
  for select to anon, authenticated using (status = 'Published');
create policy "ASOSTECH admins manage projects" on public.projects
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Published FAQs are public" on public.faqs
  for select to anon, authenticated using (status = 'Published');
create policy "ASOSTECH admins manage FAQs" on public.faqs
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "ASOSTECH admins manage leads" on public.leads
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.submit_lead(
  p_name text,
  p_email text,
  p_project_details text,
  p_service_required text default 'General enquiry',
  p_phone text default null,
  p_whatsapp text default null,
  p_project_type text default null,
  p_source text default 'website'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_name, ''))) > 120 then
    raise exception 'Please enter a valid name.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_email, ''))) > 254 or trim(coalesce(p_email, '')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_project_details, ''))) < 3 or length(trim(coalesce(p_project_details, ''))) > 5000 then
    raise exception 'Please add a short description of the project.' using errcode = '22023';
  end if;
  if p_source not in ('website', 'quote') then
    raise exception 'Invalid enquiry source.' using errcode = '22023';
  end if;

  insert into public.leads (name, email, phone, whatsapp, service_required, project_type, project_details, source)
  values (
    trim(p_name), trim(p_email), nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_whatsapp, '')), ''), left(trim(coalesce(p_service_required, 'General enquiry')), 160),
    nullif(left(trim(coalesce(p_project_type, '')), 160), ''), trim(p_project_details), p_source
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_lead(text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_lead(text, text, text, text, text, text, text, text) to anon, authenticated;

insert into public.services (slug, number, short, title, description, subtitle, icon, image, items, benefits, process, sort_order)
values
  ('electrical-installation-repairs','01','Electrical','Electrical Installation & Repairs','Professional electrical installation, troubleshooting, repairs, rewiring and maintenance for homes, offices and commercial spaces.','Reliable electrical solutions installed with care and precision.','Zap','https://images.pexels.com/photos/10871929/pexels-photo-10871929.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',array['Electrical installation','Electrical repairs','Fault diagnosis','Rewiring','Lighting installation','Electrical maintenance','Residential electrical work','Office & commercial electrical work'],array['Safety','Reliability','Efficiency','Professional workmanship'],array['Assess','Plan','Install / repair','Test','Support'],1),
  ('home-office-security','02','Security','Home & Office Security Systems','Reliable security system installation designed to protect homes, offices and commercial environments.','Protect the spaces that matter most.','ShieldCheck','https://images.pexels.com/photos/37591155/pexels-photo-37591155.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',array['Home security systems','Office security systems','Security equipment installation','Security planning','System configuration','Security upgrades'],array['Confidence','Clarity','Control','Peace of mind'],array['Understand','Assess','Plan','Install','Support'],2),
  ('cctv-alarm-systems','03','CCTV & Alarm','CCTV & Alarm System Installation','CCTV surveillance and alarm system installation for improved visibility, monitoring and protection.','Better visibility. Better protection.','Cctv','https://images.pexels.com/photos/5966513/pexels-photo-5966513.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',array['CCTV installation','Camera positioning','Surveillance setup','Recording systems','Alarm installation','System configuration','Monitoring solutions'],array['Visibility','Awareness','Protection','Control'],array['Survey','Position','Install','Configure','Support'],3),
  ('solar-inverter-installation','04','Solar & Inverter','Solar Inverter Installation','Solar and inverter installation solutions designed to provide reliable backup power and better energy independence.','Reliable backup power designed around your needs.','SunMedium','https://images.pexels.com/photos/38171111/pexels-photo-38171111.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',array['Solar inverter installation','Inverter setup','Backup power systems','Battery systems','Solar system integration','Maintenance and troubleshooting'],array['Continuity','Efficiency','Independence','Preparedness'],array['Assess','Plan','Install','Test','Support'],4)
on conflict (slug) do nothing;

insert into public.projects (slug, title, category, location, image, description, status, sort_order)
values
  ('residential-electrical-installation','Residential Electrical Installation','Electrical','Residential project','https://images.pexels.com/photos/10871929/pexels-photo-10871929.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','A considered electrical installation and repair project for a modern home.','Draft',1),
  ('office-security-installation','Office Security Installation','Security','Office environment','https://images.pexels.com/photos/37591155/pexels-photo-37591155.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','Security equipment planning and installation for a professional workspace.','Draft',2),
  ('cctv-installation','CCTV Installation','CCTV & Alarm','Commercial property','https://images.pexels.com/photos/5966513/pexels-photo-5966513.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','A practical surveillance setup focused on visibility and monitoring.','Draft',3),
  ('solar-inverter-project','Solar Inverter Project','Solar & Inverter','Residential project','https://images.pexels.com/photos/38171111/pexels-photo-38171111.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','Backup power installation planned around the needs of a modern space.','Draft',4),
  ('battery-backup-installation','Battery Backup Installation','Solar & Inverter','Energy project','https://images.pexels.com/photos/39057090/pexels-photo-39057090.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','Battery system installation to support a more resilient power setup.','Draft',5),
  ('electrical-panel-repair','Electrical Panel Repair','Electrical','Maintenance project','https://images.pexels.com/photos/17842832/pexels-photo-17842832.jpeg?auto=compress&cs=tinysrgb&h=650&w=940','Professional troubleshooting and repair work on an existing electrical system.','Draft',6)
on conflict (slug) do nothing;

insert into public.faqs (category, question, answer, status, sort_order)
values
  ('General','What services does ASOSTECH provide?','ASOSTECH focuses on electrical installation and repairs, home and office security systems, CCTV and alarm installation, and solar inverter installation.','Draft',1),
  ('Electrical','Do you install electrical systems for homes?','Yes. We provide residential electrical installation, repairs, fault diagnosis, rewiring, lighting and maintenance.','Draft',2),
  ('Electrical','Do you repair existing electrical systems?','Yes. We can assess existing systems and carry out appropriate repair and maintenance work.','Draft',3),
  ('Security','Do you install security systems for offices?','Yes. We install and configure security systems for homes, offices and commercial environments.','Draft',4),
  ('CCTV & Alarm','Can you install CCTV in an existing building?','Yes. We can review the space, recommend practical camera positions and install a suitable system.','Draft',5),
  ('CCTV & Alarm','Do you install alarm systems?','Yes. Alarm installation and system configuration are part of our CCTV and alarm service.','Draft',6),
  ('Solar & Inverter','Do you install solar inverters?','Yes. We install solar inverters, backup power systems and battery systems.','Draft',7),
  ('General','Can I request a quote before installation?','Yes. Use the quote request form to share your needs and we will review the project details.','Draft',8)
on conflict (category, question) do nothing;
