-- Tighten cancellation_requests insert policy and allow nullable requested_by
-- 1) Make requested_by nullable to support guest submissions
ALTER TABLE public.cancellation_requests ALTER COLUMN requested_by DROP NOT NULL;

-- 2) Replace overly permissive insert policy with a validated one
DROP POLICY IF EXISTS "Anyone can create cancellation requests" ON public.cancellation_requests;

-- Allow both anon and authenticated to insert ONLY if booking exists and matches hotel, and booking not cancelled
CREATE POLICY "Guests can create cancellation requests for existing booking"
ON public.cancellation_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
      AND b.hotel_id = hotel_id
      AND b.status != 'cancelled'
  )
);

-- Ensure hotel admins can view their requests (kept)
DROP POLICY IF EXISTS "Hotel admins view cancellation requests" ON public.cancellation_requests;
CREATE POLICY "Hotel admins view cancellation requests"
ON public.cancellation_requests
FOR SELECT
TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Ensure super admins can manage all
DROP POLICY IF EXISTS "Super admins manage all cancellation requests" ON public.cancellation_requests;
CREATE POLICY "Super admins manage all cancellation requests"
ON public.cancellation_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));