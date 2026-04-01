
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  duration TEXT NOT NULL DEFAULT '30',
  style TEXT NOT NULL DEFAULT 'viral',
  content_type TEXT NOT NULL DEFAULT 'story',
  goal TEXT NOT NULL DEFAULT 'viral',
  plan_type TEXT NOT NULL DEFAULT 'free',
  output_json JSONB NOT NULL DEFAULT '{}',
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (device_id based, no auth)
CREATE POLICY "Anyone can insert generations"
ON public.generations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow reading own generations by device_id
CREATE POLICY "Anyone can read own generations"
ON public.generations
FOR SELECT
TO anon, authenticated
USING (true);

-- Index for fast device_id lookups
CREATE INDEX idx_generations_device_id ON public.generations (device_id, created_at DESC);
