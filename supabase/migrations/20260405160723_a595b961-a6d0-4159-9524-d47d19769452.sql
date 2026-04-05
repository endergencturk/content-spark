-- Deactivate all existing invite codes
UPDATE public.invite_codes SET is_active = false;

-- Insert VIBERS as the only active code (ignore if exists)
INSERT INTO public.invite_codes (code, is_active)
VALUES ('VIBERS', true)
ON CONFLICT (code) DO UPDATE SET is_active = true;