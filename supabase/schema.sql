create extension if not exists pgcrypto;

create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ko text not null,
  name_en text,
  description text,
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
  summary text,
  description text,
  price numeric(8, 1) not null default 0,
  flavor_notes text[] not null default '{}',
  origin text,
  farm text,
  altitude text,
  variety text,
  processing text,
  roasting_point text,
  image_url text,
  badge text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, code)
);

create index if not exists menu_items_category_order_idx on public.menu_items(category_id, sort_order);
create index if not exists menu_items_published_idx on public.menu_items(is_published);

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
