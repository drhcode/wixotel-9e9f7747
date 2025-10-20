-- Clean all bookings and guests for the specific Villa Ester hotel by ID
DO $$
DECLARE
  v_hotel_id uuid;
BEGIN
  SELECT id INTO v_hotel_id FROM public.hotels WHERE name = 'Villa Ester' LIMIT 1;

  IF v_hotel_id IS NOT NULL THEN
    -- Delete bookings first to satisfy potential FKs
    DELETE FROM public.bookings WHERE hotel_id = v_hotel_id;
    -- Then delete guests
    DELETE FROM public.guests WHERE hotel_id = v_hotel_id;
  END IF;
END $$;