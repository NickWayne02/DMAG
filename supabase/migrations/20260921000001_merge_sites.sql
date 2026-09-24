CREATE OR REPLACE FUNCTION public.merge_sites(source_id uuid, target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_site_name text;
BEGIN
    -- Get target site name
    SELECT name INTO target_site_name FROM public.sites WHERE id = target_id;
    
    IF target_site_name IS NULL THEN
        RAISE EXCEPTION 'Target site % does not exist', target_id;
    END IF;

    -- 1. Update shifts
    UPDATE public.shifts 
    SET site_id = target_id,
        site_name = target_site_name
    WHERE site_id = source_id;

    -- 2. Update photo reports
    UPDATE public.photo_reports 
    SET site_id = target_id 
    WHERE site_id = source_id;
    
    -- 3. Delete the source site
    DELETE FROM public.sites WHERE id = source_id;
END;
$$;
