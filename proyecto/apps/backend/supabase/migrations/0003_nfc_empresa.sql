-- NFC tag linked to an object: when and by whom it was written.
alter table public.objects add column if not exists nfc_written_at timestamptz;
alter table public.objects add column if not exists nfc_written_by uuid references public.profiles (id);
