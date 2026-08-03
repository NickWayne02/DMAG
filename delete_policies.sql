CREATE POLICY "Anyone can delete their avatar." ON storage.objects FOR DELETE USING ( bucket_id = 'avatars' );
CREATE POLICY "Anyone can update their avatar." ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can delete photo reports." ON storage.objects FOR DELETE USING ( bucket_id = 'photo-reports' );
CREATE POLICY "Anyone can update photo reports." ON storage.objects FOR UPDATE USING ( bucket_id = 'photo-reports' );
