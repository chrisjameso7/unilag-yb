-- =============================================================================
-- Storage buckets
--
--   portraits               PUBLIC   yearbook portraits and selected Faces portraits.
--                                    Objects are served by public URL; keys are random
--                                    (<user-id>/<random>.<ext>) so drafts are not guessable.
--   verification-documents  PRIVATE  student ID uploads for manual review. Admins view
--                                    them through short-lived signed URLs issued by
--                                    /api/admin/verification-document/[id] (audited).
--   editorial-submissions   PRIVATE  Faces of the Year portrait submissions, reviewed by
--                                    editors. Selected portraits are copied into
--                                    "portraits" only after selection.
--
-- No storage.objects policies are created for anon/authenticated: browsers cannot
-- list, upload, overwrite or delete anything. Every upload goes through the server,
-- which validates type (by magic bytes), size and ownership first, then writes with
-- the service-role key.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portraits', 'portraits', true, 15728640, -- 15MB: selected Faces portraits are copied here; the app caps yearbook portraits at 5MB
    
     array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-documents', 'verification-documents', false, 8388608,
     array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('editorial-submissions', 'editorial-submissions', false, 15728640,
     array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
