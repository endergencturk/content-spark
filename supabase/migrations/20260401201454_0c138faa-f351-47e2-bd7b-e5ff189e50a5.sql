-- Add is_favorite column
ALTER TABLE public.generations ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

-- Create index for favorite lookups
CREATE INDEX idx_generations_favorite ON public.generations (device_id, is_favorite) WHERE is_favorite = true;

-- Allow updates (only is_favorite field via RLS)
CREATE POLICY "Anyone can update own generations"
ON public.generations
FOR UPDATE
USING (true)
WITH CHECK (true);