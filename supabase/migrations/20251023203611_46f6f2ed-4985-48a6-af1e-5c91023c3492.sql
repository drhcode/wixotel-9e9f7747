-- Update the booking_status enum to rename 'confirmed' to 'reserved'
ALTER TYPE booking_status RENAME VALUE 'confirmed' TO 'reserved';