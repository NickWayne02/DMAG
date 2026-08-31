CREATE POLICY "Admins can update chat messages" 
ON public.chat_messages 
FOR UPDATE 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin')
);
