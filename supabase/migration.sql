-- ============================================
-- Design Feedback — Supabase Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Profiles
create table if not exists profiles (
  email text primary key,
  name text not null default '',
  specialty text not null default 'ui-ux',
  bio text not null default '',
  experience text not null default '',
  linkedin_url text,
  portfolio_url text,
  is_private boolean not null default false,
  stripe_account_id text,
  stripe_onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Anyone can read profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.jwt() ->> 'email' = email);
create policy "Users can insert own profile" on profiles for insert with check (auth.jwt() ->> 'email' = email);

-- 2. Ratings
create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  target_email text not null references profiles(email) on delete cascade,
  from_email text not null,
  score int not null check (score >= 1 and score <= 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

alter table ratings enable row level security;
create policy "Anyone can read ratings" on ratings for select using (true);
create policy "Logged in users can add ratings" on ratings for insert with check (auth.jwt() ->> 'email' = from_email);

-- 3. Projects
create table if not exists projects (
  id text primary key,
  name text not null,
  base_url text not null default '',
  status text not null default 'receiving',
  applied_comment_ids text[] not null default '{}',
  completed_at timestamptz,
  completed_image_url text,
  pages jsonb not null default '[]',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;
create policy "Anyone can read receiving projects" on projects for select using (true);
create policy "Creator can insert projects" on projects for insert with check (true);
create policy "Creator can update own projects" on projects for update using (auth.jwt() ->> 'email' = created_by);
create policy "Creator can delete own projects" on projects for delete using (auth.jwt() ->> 'email' = created_by);

-- 4. Annotations
create table if not exists annotations (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  page_id text not null,
  pin_x_pct float8 not null default 0,
  pin_y_pct float8 not null default 0,
  pin_x_px float8 not null default 0,
  pin_y_px float8 not null default 0,
  region_bounds jsonb,
  category text not null default 'other',
  severity text not null default 'suggestion',
  area_label text not null default '',
  comment text not null default '',
  change_spec jsonb,
  author_name text not null default '',
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_annotations_project_page on annotations(project_id, page_id);

alter table annotations enable row level security;
create policy "Anyone can read annotations" on annotations for select using (true);
create policy "Logged in users can add annotations" on annotations for insert with check (auth.uid() is not null);
create policy "Author can update own annotations" on annotations for update using (auth.jwt() ->> 'email' is not null);
create policy "Author can delete own annotations" on annotations for delete using (auth.jwt() ->> 'email' is not null);

-- 5. Annotation Replies
create table if not exists annotation_replies (
  id text primary key,
  annotation_id text not null references annotations(id) on delete cascade,
  comment text not null default '',
  author_name text not null default '',
  created_at timestamptz not null default now()
);

alter table annotation_replies enable row level security;
create policy "Anyone can read replies" on annotation_replies for select using (true);
create policy "Logged in users can add replies" on annotation_replies for insert with check (auth.uid() is not null);
