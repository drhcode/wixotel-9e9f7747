-- Create referral_applications table
CREATE TABLE IF NOT EXISTS public.referral_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.referral_applications ENABLE ROW LEVEL SECURITY;

-- Super admins can view all applications
CREATE POLICY "Super admins can view all referral applications"
ON public.referral_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Super admins can update applications
CREATE POLICY "Super admins can update referral applications"
ON public.referral_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Anyone can insert applications
CREATE POLICY "Anyone can submit referral applications"
ON public.referral_applications
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_referral_applications_updated_at
  BEFORE UPDATE ON public.referral_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();