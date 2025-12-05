-- Add ical_token column to rooms table for secure iCal access
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS ical_token text;

-- Generate unique tokens for all existing rooms that don't have one
UPDATE public.rooms 
SET ical_token = encode(gen_random_bytes(16), 'hex')
WHERE ical_token IS NULL;

-- Create function to auto-generate token for new rooms
CREATE OR REPLACE FUNCTION public.generate_room_ical_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ical_token IS NULL THEN
    NEW.ical_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate token on insert
DROP TRIGGER IF EXISTS set_room_ical_token ON public.rooms;
CREATE TRIGGER set_room_ical_token
  BEFORE INSERT ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_room_ical_token();