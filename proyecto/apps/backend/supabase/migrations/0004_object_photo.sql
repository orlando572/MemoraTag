-- Optional photo of an object. The blob lives in the private "event-files" bucket under
-- org/<org>/object/<object>/photo/<id>; the path is never exposed to clients.
alter table public.objects add column if not exists photo_path text;
alter table public.objects add column if not exists photo_updated_at timestamptz;
