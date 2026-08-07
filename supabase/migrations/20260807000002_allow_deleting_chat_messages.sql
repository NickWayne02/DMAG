GRANT DELETE ON public.chat_messages TO authenticated;

CREATE POLICY "Authenticated can delete own chat messages" 
ON public.chat_messages 
FOR DELETE 
TO authenticated 
USING (auth.uid() = author_id);

CREATE POLICY "Admins can delete chat messages" 
ON public.chat_messages 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));
