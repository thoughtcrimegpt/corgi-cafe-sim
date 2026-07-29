-- THE WALL — run this once in the Supabase SQL editor (same project as the
-- other games). Notes are structured: a curated phrase index + run stats +
-- a handle the DATABASE validates. No free text anywhere.
--
-- Moderation: flip `hidden` to true on any row in the Table Editor and it
-- vanishes from the game. Anon can only INSERT and SELECT visible rows.

create table if not exists cafe_notes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  handle text not null check (handle ~ '^[A-Za-z0-9_]{1,15}$'),
  phrase int not null check (phrase >= 0 and phrase < 200),
  ship int not null check (ship between 0 and 100),
  tmin int not null check (tmin between 167 and 360),
  shift int not null check (shift between 1 and 20000),
  won boolean not null default false,
  claims int not null check (claims between 0 and 3),
  hidden boolean not null default false
);

alter table cafe_notes enable row level security;

create policy "anon reads visible notes" on cafe_notes
  for select using (hidden = false);

create policy "anon pins notes" on cafe_notes
  for insert with check (hidden = false);
