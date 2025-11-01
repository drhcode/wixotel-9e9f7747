-- Fix function search_path security issues
-- Update has_role function to set search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update notify_booking_deleted function to set search_path
CREATE OR REPLACE FUNCTION public.notify_booking_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (hotel_id, type, title, message, is_read)
  VALUES (
    OLD.hotel_id,
    'booking_deleted',
    'Reservation Deleted',
    'Reservation for ' || OLD.full_name || ' has been deleted',
    false
  );
  RETURN OLD;
END;
$$;

-- Update check_booking_overlap function to set search_path
CREATE OR REPLACE FUNCTION public.check_booking_overlap(
  p_room_id uuid, 
  p_check_in date, 
  p_check_out date, 
  p_booking_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM bookings
    WHERE room_id = p_room_id
      AND status NOT IN ('cancelled')
      AND (p_booking_id IS NULL OR id != p_booking_id)
      AND p_check_in < check_out
      AND check_in < p_check_out
  );
END;
$$;

-- Update get_available_rooms function to set search_path
CREATE OR REPLACE FUNCTION public.get_available_rooms(
  p_hotel_id uuid, 
  p_check_in date, 
  p_check_out date,
  p_booking_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, room_number text, room_type text, price numeric, capacity integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.room_number,
    r.room_type,
    r.price,
    r.capacity
  FROM rooms r
  WHERE r.hotel_id = p_hotel_id
    AND r.is_available = true
    AND NOT EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.room_id = r.id
        AND b.status NOT IN ('cancelled', 'checked_out')
        AND (p_booking_id IS NULL OR b.id != p_booking_id)
        AND p_check_in < b.check_out
        AND b.check_in < p_check_out
    );
END;
$$;

-- Update storage policies to use security definer function instead of inline queries
DROP POLICY IF EXISTS "Hotel admins can upload their hotel assets" ON storage.objects;
DROP POLICY IF EXISTS "Hotel admins can view their hotel assets" ON storage.objects;
DROP POLICY IF EXISTS "Hotel admins can update their hotel assets" ON storage.objects;
DROP POLICY IF EXISTS "Hotel admins can delete their hotel assets" ON storage.objects;

CREATE POLICY "Hotel admins can upload their hotel assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hotel-assets' 
  AND (storage.foldername(name))[1] = public.get_user_hotel_id(auth.uid())::text
);

CREATE POLICY "Hotel admins can view their hotel assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'hotel-assets' 
  AND (storage.foldername(name))[1] = public.get_user_hotel_id(auth.uid())::text
);

CREATE POLICY "Hotel admins can update their hotel assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'hotel-assets' 
  AND (storage.foldername(name))[1] = public.get_user_hotel_id(auth.uid())::text
);

CREATE POLICY "Hotel admins can delete their hotel assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'hotel-assets' 
  AND (storage.foldername(name))[1] = public.get_user_hotel_id(auth.uid())::text
);