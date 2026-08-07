DROP POLICY IF EXISTS "Auth can upload photo-reports" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update photo-reports" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete photo-reports" ON storage.objects;

CREATE POLICY "Auth can upload photo-reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photo-reports');

CREATE POLICY "Owner can update photo-reports"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photo-reports' AND owner = auth.uid());

CREATE POLICY "Owner can delete photo-reports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photo-reports' AND owner = auth.uid());
