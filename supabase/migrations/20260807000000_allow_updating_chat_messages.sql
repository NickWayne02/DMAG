GRANT UPDATE ON public.chat_messages TO authenticated;

CREATE POLICY "Authenticated can update own chat messages" 
ON public.chat_messages 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);
