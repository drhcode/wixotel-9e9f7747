-- Clear all data for Villa Ester hotel
DO $$
DECLARE
  v_hotel_id uuid;
BEGIN
  SELECT id INTO v_hotel_id FROM public.hotels WHERE name = 'Villa Ester' LIMIT 1;

  IF v_hotel_id IS NOT NULL THEN
    -- Delete bookings first (they reference rooms and guests)
    DELETE FROM public.bookings WHERE hotel_id = v_hotel_id;
    
    -- Delete guests
    DELETE FROM public.guests WHERE hotel_id = v_hotel_id;
    
    -- Delete rooms
    DELETE FROM public.rooms WHERE hotel_id = v_hotel_id;
  END IF;
END $$;