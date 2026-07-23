
CREATE POLICY "Auth can read photo-reports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photo-reports');

CREATE POLICY "Auth can upload photo-reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photo-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can update photo-reports"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photo-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can delete photo-reports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photo-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
