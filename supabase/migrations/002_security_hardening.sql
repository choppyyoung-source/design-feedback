-- ============================================
-- Design Feedback — Security Hardening
-- Run in Supabase SQL Editor after migration.sql
-- ============================================
-- Idempotent: safe to re-run.
--
-- What this fixes:
--   1. Stripe account IDs + payout info split into private table (was world-readable)
--   2. Projects INSERT now requires auth (was `with check (true)` — anyone could spawn projects)
--   3. Annotations UPDATE/DELETE now constrained to project owner or matching author email
--      (was allowing any logged-in user to mutate anyone else's annotations)
--   4. Annotation_replies UPDATE/DELETE policies added (were missing entirely)
--   5. Storage uploads limited by MIME type + only authenticated users (was already authenticated,
--      but we also add DELETE policy and size limits)
--
-- NOTE: coexists with 001_initial_schema.sql (reviews/annotations/etc). That schema is unused
-- in production — the live app uses migration.sql's projects/annotations tables. We only harden
-- the live schema here.

-- ────────────────────────────────────────────
-- 1. Profiles — split sensitive columns into separate table
-- ────────────────────────────────────────────

-- Private payout data table. Only the owner can read/write their row.
create table if not exists profile_private (
  email text primary key references profiles(email) on delete cascade,
  stripe_account_id text,
  stripe_onboarded boolean not null default false,
  payout_method text,
  paypal_email text,
  bank_info text,
  updated_at timestamptz not null default now()
);

alter table profile_private enable row level security;

-- Only owner can read/write their private data
drop policy if exists "Owner reads private profile" on profile_private;
create policy "Owner reads private profile" on profile_private
  for select using (auth.jwt() ->> 'email' = email);

drop policy if exists "Owner writes private profile" on profile_private;
create policy "Owner writes private profile" on profile_private
  for insert with check (auth.jwt() ->> 'email' = email);

drop policy if exists "Owner updates private profile" on profile_private;
create policy "Owner updates private profile" on profile_private
  for update using (auth.jwt() ->> 'email' = email);

-- Backfill from profiles if those columns still exist.
-- Use a DO block so this is a no-op on already-migrated DBs.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'stripe_account_id'
  ) then
    insert into profile_private (email, stripe_account_id, stripe_onboarded)
    select email, stripe_account_id, coalesce(stripe_onboarded, false)
    from profiles
    where stripe_account_id is not null
    on conflict (email) do update
      set stripe_account_id = excluded.stripe_account_id,
          stripe_onboarded = excluded.stripe_onboarded,
          updated_at = now();

    alter table profiles drop column if exists stripe_account_id;
    alter table profiles drop column if exists stripe_onboarded;
  end if;
end $$;

-- Tighten profiles SELECT: still publicly readable (needed for designer directory),
-- but sensitive columns have been removed above.
-- Keep existing read-all policy — it's intentional for the public directory.

-- ────────────────────────────────────────────
-- 2. Projects — require auth for INSERT, tighten UPDATE/DELETE
-- ────────────────────────────────────────────

drop policy if exists "Creator can insert projects" on projects;
create policy "Authenticated users insert own projects" on projects
  for insert with check (
    auth.jwt() ->> 'email' is not null
    and auth.jwt() ->> 'email' = created_by
  );

drop policy if exists "Creator can update own projects" on projects;
create policy "Owner updates own projects" on projects
  for update using (auth.jwt() ->> 'email' = created_by)
  with check (auth.jwt() ->> 'email' = created_by);

drop policy if exists "Creator can delete own projects" on projects;
create policy "Owner deletes own projects" on projects
  for delete using (auth.jwt() ->> 'email' = created_by);

-- ────────────────────────────────────────────
-- 3. Annotations — add author_email for proper ownership
-- ────────────────────────────────────────────

-- Add author_email if missing (required for per-row ownership)
alter table annotations add column if not exists author_email text;
create index if not exists idx_annotations_author_email on annotations(author_email);

-- New INSERT: must match the caller's email (if set), or anonymous with null email
drop policy if exists "Logged in users can add annotations" on annotations;
create policy "Users insert annotations with own email" on annotations
  for insert with check (
    auth.jwt() ->> 'email' is not null
    and (author_email is null or author_email = auth.jwt() ->> 'email')
  );

-- UPDATE: only the original author (by email) OR the project owner
drop policy if exists "Author can update own annotations" on annotations;
create policy "Author or project owner updates annotation" on annotations
  for update using (
    auth.jwt() ->> 'email' is not null
    and (
      auth.jwt() ->> 'email' = author_email
      or exists (
        select 1 from projects p
        where p.id = annotations.project_id
          and p.created_by = auth.jwt() ->> 'email'
      )
    )
  );

-- DELETE: same rule
drop policy if exists "Author can delete own annotations" on annotations;
create policy "Author or project owner deletes annotation" on annotations
  for delete using (
    auth.jwt() ->> 'email' is not null
    and (
      auth.jwt() ->> 'email' = author_email
      or exists (
        select 1 from projects p
        where p.id = annotations.project_id
          and p.created_by = auth.jwt() ->> 'email'
      )
    )
  );

-- ────────────────────────────────────────────
-- 4. Annotation replies — add author_email + tighten policies
-- ────────────────────────────────────────────

alter table annotation_replies add column if not exists author_email text;

drop policy if exists "Logged in users can add replies" on annotation_replies;
create policy "Users insert replies with own email" on annotation_replies
  for insert with check (
    auth.jwt() ->> 'email' is not null
    and (author_email is null or author_email = auth.jwt() ->> 'email')
  );

drop policy if exists "Author updates own reply" on annotation_replies;
create policy "Author updates own reply" on annotation_replies
  for update using (
    auth.jwt() ->> 'email' is not null
    and auth.jwt() ->> 'email' = author_email
  );

drop policy if exists "Author deletes own reply" on annotation_replies;
create policy "Author deletes own reply" on annotation_replies
  for delete using (
    auth.jwt() ->> 'email' is not null
    and auth.jwt() ->> 'email' = author_email
  );

-- ────────────────────────────────────────────
-- 5. Ratings — already has insert check, tighten read if needed
-- ────────────────────────────────────────────
-- ratings.from_email is user-provided but the insert policy already enforces
-- auth.jwt() ->> 'email' = from_email, so leave as-is.
-- Add delete policy so users can remove their own ratings.
drop policy if exists "Author deletes own rating" on ratings;
create policy "Author deletes own rating" on ratings
  for delete using (auth.jwt() ->> 'email' = from_email);

-- ────────────────────────────────────────────
-- 6. Storage: feedback-images bucket + hardening
-- ────────────────────────────────────────────

-- Create feedback-images bucket if missing (app writes to this, not review-images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-images',
  'feedback-images',
  true,
  5 * 1024 * 1024,  -- 5 MB per file
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Tighten review-images too (legacy bucket from 001)
update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
where id = 'review-images';

-- feedback-images policies
drop policy if exists "Anyone can view feedback images" on storage.objects;
create policy "Anyone can view feedback images" on storage.objects
  for select using (bucket_id = 'feedback-images');

drop policy if exists "Authenticated upload feedback images" on storage.objects;
create policy "Authenticated upload feedback images" on storage.objects
  for insert with check (
    bucket_id = 'feedback-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Authenticated delete own feedback images" on storage.objects;
create policy "Authenticated delete own feedback images" on storage.objects
  for delete using (
    bucket_id = 'feedback-images'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
  );
