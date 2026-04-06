-- Reviews table
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  image_width integer not null default 0,
  image_height integer not null default 0,
  design_context jsonb,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Annotations table
create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  pin_x_pct real not null,
  pin_y_pct real not null,
  pin_x_px integer not null,
  pin_y_px integer not null,
  category text not null default 'other',
  severity text not null default 'suggestion',
  area_label text not null default '',
  comment text not null,
  change_spec jsonb,
  author_name text not null default 'Anonymous',
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- Annotation replies
create table public.annotation_replies (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references public.annotations(id) on delete cascade,
  comment text not null,
  author_name text not null default 'Anonymous',
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_annotations_review_id on public.annotations(review_id);
create index idx_replies_annotation_id on public.annotation_replies(annotation_id);
create index idx_reviews_share_token on public.reviews(share_token);

-- RLS
alter table public.reviews enable row level security;
alter table public.annotations enable row level security;
alter table public.annotation_replies enable row level security;

-- Reviews policies
create policy "Anyone can view reviews with share token" on public.reviews
  for select using (true);

create policy "Authenticated users can create reviews" on public.reviews
  for insert with check (auth.uid() = created_by);

create policy "Owners can update their reviews" on public.reviews
  for update using (auth.uid() = created_by);

create policy "Owners can delete their reviews" on public.reviews
  for delete using (auth.uid() = created_by);

-- Annotations policies (anyone can read/create on accessible reviews)
create policy "Anyone can view annotations" on public.annotations
  for select using (true);

create policy "Anyone can create annotations" on public.annotations
  for insert with check (true);

create policy "Authors can update their annotations" on public.annotations
  for update using (true);

create policy "Authors can delete their annotations" on public.annotations
  for delete using (true);

-- Replies policies
create policy "Anyone can view replies" on public.annotation_replies
  for select using (true);

create policy "Anyone can create replies" on public.annotation_replies
  for insert with check (true);

-- Storage bucket for review images
insert into storage.buckets (id, name, public) values ('review-images', 'review-images', true);

create policy "Anyone can view review images" on storage.objects
  for select using (bucket_id = 'review-images');

create policy "Authenticated users can upload images" on storage.objects
  for insert with check (bucket_id = 'review-images' and auth.role() = 'authenticated');
