-- Rename guest_name to full_name in bookings table
ALTER TABLE bookings RENAME COLUMN guest_name TO full_name;