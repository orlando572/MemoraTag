-- Attachments (photos and documents) of events. Blobs live in the private Storage bucket "event-files".

create table public.event_files (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  organization_id uuid not null references public.organizations (id),
  object_id uuid not null references public.objects (id),
  kind text not null check (kind in ('photo', 'document')),
  name text not null,
  mime text not null,
  size integer not null check (size >= 0),
  storage_path text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index event_files_event_idx on public.event_files (event_id) where deleted_at is null;

-- RLS on with no policies: access only through the backend.
alter table public.event_files enable row level security;

-- Private, idempotent bucket (5 MB, photos and documents only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-files', 'event-files', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
on conflict (id) do nothing;
