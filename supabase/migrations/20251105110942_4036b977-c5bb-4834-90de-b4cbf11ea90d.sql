-- Add INSERT policy for hotel admins to create earnings records
CREATE POLICY "Hotel admins can insert their earnings"
ON public.earnings
FOR INSERT
WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()));