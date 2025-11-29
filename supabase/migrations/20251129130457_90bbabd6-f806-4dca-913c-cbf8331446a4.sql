-- Add referral role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'referral';

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add referred_by column to hotels
ALTER TABLE public.hotels ADD COLUMN referred_by UUID REFERENCES public.referrals(id);

-- Create referral_earnings table to track monthly earnings
CREATE TABLE public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  plan_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 10.0,
  commission_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referral_id, hotel_id, month_year)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
CREATE POLICY "Super admins can manage all referrals"
  ON public.referrals FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Referrals can view their own data"
  ON public.referrals FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Referrals can update their own data"
  ON public.referrals FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for referral_earnings table
CREATE POLICY "Super admins can manage all earnings"
  ON public.referral_earnings FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Referrals can view their own earnings"
  ON public.referral_earnings FOR SELECT
  USING (referral_id IN (SELECT id FROM public.referrals WHERE user_id = auth.uid()));

-- Create indexes
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_user_id ON public.referrals(user_id);
CREATE INDEX idx_hotels_referred_by ON public.hotels(referred_by);
CREATE INDEX idx_referral_earnings_referral ON public.referral_earnings(referral_id);
CREATE INDEX idx_referral_earnings_month ON public.referral_earnings(month_year);

-- Create trigger for updated_at
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_earnings_updated_at
  BEFORE UPDATE ON public.referral_earnings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate monthly referral earnings
CREATE OR REPLACE FUNCTION public.calculate_referral_earnings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
  hotel_record RECORD;
  referral_record RECORD;
  plan_price NUMERIC;
  commission NUMERIC;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Loop through all hotels with referrals
  FOR hotel_record IN 
    SELECT h.id, h.referred_by, h.plan_id, h.status
    FROM hotels h
    WHERE h.referred_by IS NOT NULL 
      AND h.status = 'active'
  LOOP
    -- Get plan price
    SELECT price INTO plan_price
    FROM subscription_plans
    WHERE id = hotel_record.plan_id;
    
    IF plan_price IS NOT NULL THEN
      commission := plan_price * 0.10; -- 10% commission
      
      -- Insert or update earnings record
      INSERT INTO referral_earnings (
        referral_id,
        hotel_id,
        month_year,
        plan_amount,
        commission_rate,
        commission_amount,
        status
      ) VALUES (
        hotel_record.referred_by,
        hotel_record.id,
        current_month,
        plan_price,
        10.0,
        commission,
        'pending'
      )
      ON CONFLICT (referral_id, hotel_id, month_year) 
      DO UPDATE SET
        plan_amount = EXCLUDED.plan_amount,
        commission_amount = EXCLUDED.commission_amount,
        updated_at = now();
    END IF;
  END LOOP;
END;
$$;