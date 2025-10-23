-- Enable data clear permission for Villa Ester
UPDATE hotels SET allow_data_clear = true WHERE id = '957f8596-368b-45d0-ae9b-0447e0497c6a';

-- Delete all bookings for Villa Ester
DELETE FROM bookings WHERE hotel_id = '957f8596-368b-45d0-ae9b-0447e0497c6a';

-- Delete all guests for Villa Ester
DELETE FROM guests WHERE hotel_id = '957f8596-368b-45d0-ae9b-0447e0497c6a';