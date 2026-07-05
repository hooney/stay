create extension if not exists pgcrypto;

create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  menu_type text not null default 'coffee' check (menu_type in ('coffee', 'non-coffee', 'dessert')),
  name_ko text not null,
  name_en text,
  description text,
  page_title text,
  page_description text,
  layout_variant text not null default 'list' check (layout_variant in ('list', 'split-banners')),
  background_color text not null default '#EFF4F5',
  banner_image_url text,
  banner_image_alt text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  code text,
  name_ko text not null,
  name_en text,
  subtitle text,
  summary text,
  description text,
  detail_title text,
  detail_body text,
  detail_highlight text,
  price numeric(8, 1) not null default 0,
  flavor_notes text[] not null default '{}',
  flavor_notes_en text[] not null default '{}',
  origin text,
  farm text,
  altitude text,
  variety text,
  processing text,
  roasting_point text,
  main_flavor_color text,
  sub_flavor_color text,
  image_url text,
  detail_image_url text,
  position_image_url text,
  badge text,
  badges text[] not null default '{}',
  status text not null default 'available' check (status in ('available', 'soldout', 'coming', 'limited')),
  display_code boolean not null default true,
  serve_note text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, code)
);

create index if not exists menu_items_category_order_idx on public.menu_items(category_id, sort_order);
create index if not exists menu_items_published_idx on public.menu_items(is_published);

alter table public.menu_categories add column if not exists menu_type text not null default 'coffee';
alter table public.menu_categories add column if not exists page_title text;
alter table public.menu_categories add column if not exists page_description text;
alter table public.menu_categories add column if not exists layout_variant text not null default 'list';
alter table public.menu_categories add column if not exists background_color text not null default '#EFF4F5';
alter table public.menu_categories add column if not exists banner_image_url text;
alter table public.menu_categories add column if not exists banner_image_alt text;

alter table public.menu_items add column if not exists subtitle text;
alter table public.menu_items add column if not exists detail_title text;
alter table public.menu_items add column if not exists detail_body text;
alter table public.menu_items add column if not exists detail_highlight text;
alter table public.menu_items add column if not exists flavor_notes_en text[] not null default '{}';
alter table public.menu_items add column if not exists main_flavor_color text;
alter table public.menu_items add column if not exists sub_flavor_color text;
alter table public.menu_items add column if not exists detail_image_url text;
alter table public.menu_items add column if not exists position_image_url text;
alter table public.menu_items add column if not exists badges text[] not null default '{}';
alter table public.menu_items add column if not exists status text not null default 'available';
alter table public.menu_items add column if not exists display_code boolean not null default true;
alter table public.menu_items add column if not exists serve_note text;

create index if not exists menu_categories_type_order_idx on public.menu_categories(menu_type, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_menu_categories_updated_at on public.menu_categories;
create trigger set_menu_categories_updated_at
before update on public.menu_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

create or replace function public.is_cms_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cms_admins
    where user_id = auth.uid()
  );
$$;

create or replace function public.claim_cms_admin(setup_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  setup_hash constant text := '$2a$06$hnDHTeIud89auugeVO6e6u0bFl3w4RBlN3m2R7pZV0lt3kGiDW5JW';
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.cms_admins) then
    raise exception 'Admin already configured';
  end if;

  if crypt(setup_code, setup_hash) <> setup_hash then
    raise exception 'Invalid setup code';
  end if;

  insert into public.cms_admins (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  return true;
end;
$$;

alter table public.cms_admins enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

drop policy if exists "Admins can read admins" on public.cms_admins;
create policy "Admins can read admins"
on public.cms_admins for select
to authenticated
using (public.is_cms_admin());

drop policy if exists "Public can read active categories" on public.menu_categories;
create policy "Public can read active categories"
on public.menu_categories for select
to anon, authenticated
using (is_active or public.is_cms_admin());

drop policy if exists "Admins can insert categories" on public.menu_categories;
create policy "Admins can insert categories"
on public.menu_categories for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "Admins can update categories" on public.menu_categories;
create policy "Admins can update categories"
on public.menu_categories for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "Admins can delete categories" on public.menu_categories;
create policy "Admins can delete categories"
on public.menu_categories for delete
to authenticated
using (public.is_cms_admin());

drop policy if exists "Public can read published items" on public.menu_items;
create policy "Public can read published items"
on public.menu_items for select
to anon, authenticated
using (
  public.is_cms_admin()
  or (
    is_published
    and exists (
      select 1
      from public.menu_categories c
      where c.id = category_id
        and c.is_active
    )
  )
);

drop policy if exists "Admins can insert items" on public.menu_items;
create policy "Admins can insert items"
on public.menu_items for insert
to authenticated
with check (public.is_cms_admin());

drop policy if exists "Admins can update items" on public.menu_items;
create policy "Admins can update items"
on public.menu_items for update
to authenticated
using (public.is_cms_admin())
with check (public.is_cms_admin());

drop policy if exists "Admins can delete items" on public.menu_items;
create policy "Admins can delete items"
on public.menu_items for delete
to authenticated
using (public.is_cms_admin());
