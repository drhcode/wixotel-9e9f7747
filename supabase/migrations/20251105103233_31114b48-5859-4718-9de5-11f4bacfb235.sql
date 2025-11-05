-- Make phone optional to match UI requirement in New Reservation flow
-- Guests: allow NULL phone
ALTER TABLE public.guests
  ALTER COLUMN phone DROP NOT NULL;

-- Bookings: allow NULL guest_phone
ALTER TABLE public.bookings
  ALTER COLUMN guest_phone DROP NOT NULL;