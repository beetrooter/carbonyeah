-- ============================================================
-- 001_core_schema.sql
-- Communities, membership, emission logs, emission factors
-- ============================================================

-- Communities
create table if not exists communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Community membership (many-to-many users ↔ communities)
create table if not exists community_members (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references communities(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  unique(community_id, user_id)
);

-- Emission factors lookup table (seeded below)
create table if not exists emission_factors (
  id                  uuid primary key default gen_random_uuid(),
  category            text not null,   -- Travel | Energy | Food | Other
  subcategory         text not null,   -- flight | car | electricity | beef …
  activity            text not null,   -- human-readable label
  kg_co2e_per_unit    numeric not null,
  unit                text not null,   -- km | kWh | kg | hour …
  notes               text,
  -- v1.1 placeholder: swap this row for an external API call
  source              text not null default 'internal_lookup'
);

-- Emission logs (one row per user activity)
create table if not exists emission_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category      text not null,
  subcategory   text,
  description   text,                  -- free-text / voice transcription
  quantity      numeric,               -- e.g. 500 (km), 2.5 (kWh)
  unit          text,                  -- mirrors emission_factors.unit
  kg_co2e       numeric not null,      -- calculated, never entered by user
  data_source   text not null default 'manual',  -- manual | bank | travel_app | motion
  -- v1.1 placeholders for connected data sources:
  external_ref  text,                  -- e.g. bank transaction ID, flight booking ref
  logged_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- Index for fast dashboard queries
create index if not exists emission_logs_user_logged_at
  on emission_logs(user_id, logged_at desc);

create index if not exists emission_logs_logged_at
  on emission_logs(logged_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table communities enable row level security;
alter table community_members enable row level security;
alter table emission_factors enable row level security;
alter table emission_logs enable row level security;

-- Communities: visible to members, editable only by creator
create policy "communities_select" on communities
  for select using (
    auth.uid() = created_by
    or exists (
      select 1 from community_members
      where community_id = communities.id and user_id = auth.uid()
    )
  );
create policy "communities_insert" on communities
  for insert with check (auth.uid() = created_by);
create policy "communities_update" on communities
  for update using (auth.uid() = created_by);
create policy "communities_delete" on communities
  for delete using (auth.uid() = created_by);

-- Community members: visible to members of the same community
create policy "community_members_select" on community_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from community_members cm2
      where cm2.community_id = community_members.community_id
        and cm2.user_id = auth.uid()
    )
  );
create policy "community_members_insert" on community_members
  for insert with check (user_id = auth.uid());
create policy "community_members_delete" on community_members
  for delete using (user_id = auth.uid());

-- Emission factors: read-only for all authenticated users
create policy "emission_factors_select" on emission_factors
  for select using (auth.role() = 'authenticated');

-- Emission logs: users see only their own
create policy "emission_logs_select" on emission_logs
  for select using (user_id = auth.uid());
create policy "emission_logs_insert" on emission_logs
  for insert with check (user_id = auth.uid());
create policy "emission_logs_update" on emission_logs
  for update using (user_id = auth.uid());
create policy "emission_logs_delete" on emission_logs
  for delete using (user_id = auth.uid());

-- ============================================================
-- Seed: emission factors
-- ============================================================

insert into emission_factors (category, subcategory, activity, kg_co2e_per_unit, unit, notes) values
  -- Travel
  ('Travel', 'flight',       'Short-haul flight (< 3h)',     0.255,  'km',   'Economy, incl. radiative forcing'),
  ('Travel', 'flight',       'Long-haul flight (> 3h)',      0.195,  'km',   'Economy, incl. radiative forcing'),
  ('Travel', 'car',          'Petrol car (avg)',              0.171,  'km',   'Average petrol passenger car'),
  ('Travel', 'car',          'Diesel car (avg)',              0.168,  'km',   'Average diesel passenger car'),
  ('Travel', 'car',          'Electric car (UK grid)',        0.053,  'km',   'UK grid average 2024'),
  ('Travel', 'car',          'Hybrid car (avg)',              0.106,  'km',   'Plug-in hybrid average'),
  ('Travel', 'motorbike',    'Motorbike (avg)',               0.114,  'km',   'Average motorbike'),
  ('Travel', 'bus',          'Local bus',                    0.089,  'km',   'Average UK local bus'),
  ('Travel', 'train',        'National rail',                0.035,  'km',   'UK national rail average'),
  ('Travel', 'train',        'London Underground',           0.028,  'km',   'TfL Tube average'),
  ('Travel', 'ferry',        'Car ferry (as passenger)',     0.187,  'km',   'Foot passenger on car ferry'),
  -- Energy
  ('Energy', 'electricity',  'UK grid electricity',          0.233,  'kWh',  'DESNZ 2024 grid intensity'),
  ('Energy', 'electricity',  'Solar / renewables',           0.006,  'kWh',  'Lifecycle emissions only'),
  ('Energy', 'gas',          'Natural gas (home heating)',   0.183,  'kWh',  'Combustion + upstream'),
  ('Energy', 'oil',          'Heating oil',                  0.247,  'kWh',  'Combustion + upstream'),
  ('Energy', 'lpg',          'LPG (bottled gas)',            0.214,  'kWh',  'Combustion + upstream'),
  -- Food
  ('Food',   'beef',         'Beef',                        27.0,   'kg',   'Global average incl. land use'),
  ('Food',   'lamb',         'Lamb',                        39.2,   'kg',   'Global average incl. land use'),
  ('Food',   'pork',         'Pork',                         7.6,   'kg',   'Global average'),
  ('Food',   'chicken',      'Chicken',                      6.9,   'kg',   'Global average'),
  ('Food',   'fish',         'Fish (farmed salmon)',         11.9,   'kg',   'Farmed salmon'),
  ('Food',   'fish',         'Fish (white fish)',             3.1,   'kg',   'Average white fish'),
  ('Food',   'dairy',        'Milk',                         3.2,   'kg',   'Per kg whole milk'),
  ('Food',   'dairy',        'Cheese',                      13.5,   'kg',   'Per kg average cheese'),
  ('Food',   'eggs',         'Eggs',                         4.5,   'kg',   'Per kg eggs'),
  ('Food',   'vegetables',   'Vegetables (avg)',              2.0,   'kg',   'Mixed average'),
  ('Food',   'fruit',        'Fruit (avg)',                   1.1,   'kg',   'Mixed average'),
  ('Food',   'cereals',      'Bread / cereals',              1.4,   'kg',   'Average wheat products'),
  -- Other
  ('Other',  'streaming',    'Video streaming (1h)',         0.036,  'hour', 'Average device + network'),
  ('Other',  'clothing',     'New clothing item (avg)',      10.0,   'item', 'Average garment lifecycle'),
  ('Other',  'smartphone',   'New smartphone',              70.0,   'item', 'Manufacturing + delivery'),
  ('Other',  'waste',        'General waste (landfill)',      0.467, 'kg',   'UK landfill average')
;
