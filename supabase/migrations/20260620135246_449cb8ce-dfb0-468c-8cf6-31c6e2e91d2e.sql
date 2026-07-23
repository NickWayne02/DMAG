
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS start_lat double precision,
  ADD COLUMN IF NOT EXISTS start_lng double precision,
  ADD COLUMN IF NOT EXISTS start_city text,
  ADD COLUMN IF NOT EXISTS end_lat double precision,
  ADD COLUMN IF NOT EXISTS end_lng double precision,
  ADD COLUMN IF NOT EXISTS end_city text;
