-- Companies / inventory base schema. Access is only through the backend (service connection).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index profiles_email_idx on public.profiles (lower(email));

-- Fill profiles whenever a user is created in auth.users.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users that already exist.
insert into public.profiles (id, email) select id, coalesce(email, '') from auth.users on conflict (id) do nothing;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  user_id uuid not null references public.profiles (id),
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index organization_members_active_idx on public.organization_members (organization_id, user_id) where deleted_at is null;
create index organization_members_user_idx on public.organization_members (user_id) where deleted_at is null;

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id), -- null = personal object (future)
  name text not null,
  description text not null default '',
  color text not null default '#6b7280',
  internal_code text,
  category text,
  location text,
  assignee text,
  status text not null default 'in_use' check (status in ('in_use', 'in_repair', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);
create index objects_organization_idx on public.objects (organization_id, status) where deleted_at is null;
create index objects_code_idx on public.objects (organization_id, internal_code);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id),
  type text not null check (type in ('note', 'issue', 'maintenance', 'resolved', 'photo', 'document')),
  title text not null,
  description text not null default '',
  event_date timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index events_object_idx on public.events (object_id, created_at desc) where deleted_at is null;

-- RLS on with no policies: anon/authenticated roles get no access; the backend connects with a privileged role.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.objects enable row level security;
alter table public.events enable row level security;
