-- 1. Добавить колонку avatar_url в profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Создать bucket avatars (если не существует)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Политики безопасности для бакета avatars
-- Разрешить всем на чтение аватаров
CREATE POLICY "Avatars are publicly accessible."
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Разрешить аутентифицированным пользователям загружать картинки в папку avatars
CREATE POLICY "Users can upload avatars."
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

-- Разрешить пользователям обновлять/удалять свои аватары (при необходимости)
CREATE POLICY "Users can update their avatars."
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their avatars."
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);
