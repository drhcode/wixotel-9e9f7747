-- Drop all existing policies on cancellation_requests
DROP POLICY IF EXISTS "Hotel admins can create cancellation requests" ON cancellation_requests;
DROP POLICY IF EXISTS "Anyone can create cancellation requests" ON cancellation_requests;
DROP POLICY IF EXISTS "Hotel admins can view their cancellation requests" ON cancellation_requests;
DROP POLICY IF EXISTS "Super admins can manage cancellation requests" ON cancellation_requests;

-- New policy: Allow anyone to create cancellation requests (even unauthenticated guests)
CREATE POLICY "Anyone can create cancellation requests"
ON cancellation_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Hotel admins can view their own hotel's cancellation requests
CREATE POLICY "Hotel admins view cancellation requests"
ON cancellation_requests
FOR SELECT
TO authenticated
USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Super admins can manage everything
CREATE POLICY "Super admins manage all cancellation requests"
ON cancellation_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));