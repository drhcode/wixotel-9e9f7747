-- Delete all bookings for Villa Ester hotel
DELETE FROM public.bookings 
WHERE hotel_id = (SELECT id FROM public.hotels WHERE name = 'Villa Ester');

-- Delete all guests for Villa Ester hotel
DELETE FROM public.guests 
WHERE hotel_id = (SELECT id FROM public.hotels WHERE name = 'Villa Ester');