
-- Allow referral partners to view hotels they referred
CREATE POLICY "Referrals can view hotels they referred"
ON public.hotels
FOR SELECT
USING (
  referred_by IN (
    SELECT id FROM public.referrals WHERE user_id = auth.uid()
  )
);
