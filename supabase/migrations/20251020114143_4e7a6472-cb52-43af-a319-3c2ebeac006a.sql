-- Add super admin policies for viewing all bookings
CREATE POLICY "Super admins can view all bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Add super admin policies for viewing all guests
CREATE POLICY "Super admins can view all guests"
ON public.guests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Add super admin policy for managing all guests
CREATE POLICY "Super admins can manage all guests"
ON public.guests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Add super admin policy for managing all bookings
CREATE POLICY "Super admins can manage all bookings"
ON public.bookings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);