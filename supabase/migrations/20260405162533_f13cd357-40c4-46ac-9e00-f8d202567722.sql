CREATE POLICY "Users can delete their own generations"
ON public.generations
FOR DELETE
USING (true);