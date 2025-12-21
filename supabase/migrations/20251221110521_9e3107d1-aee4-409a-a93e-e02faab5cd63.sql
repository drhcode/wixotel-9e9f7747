-- Create a function to lookup referral code that bypasses RLS
CREATE OR REPLACE FUNCTION public.lookup_referral_code(p_referral_code TEXT)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.referrals 
  WHERE referral_code = p_referral_code 
  AND is_active = true
  LIMIT 1
$$;