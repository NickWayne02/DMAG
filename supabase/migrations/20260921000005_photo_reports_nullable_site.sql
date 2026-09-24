-- Make site_id nullable so photo reports from general chat (no site) can be stored
ALTER TABLE public.photo_reports ALTER COLUMN site_id DROP NOT NULL;
