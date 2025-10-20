-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  price numeric NOT NULL,
  billing_period text NOT NULL DEFAULT 'monthly',
  features text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Super admins can manage all plans
CREATE POLICY "Super admins can manage all plans"
ON public.subscription_plans
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Insert default plans
INSERT INTO public.subscription_plans (name, price, billing_period, features) VALUES
('Basic', 29.99, 'monthly', ARRAY['Up to 10 rooms', 'Basic reporting', 'Email support']),
('Pro', 79.99, 'monthly', ARRAY['Up to 50 rooms', 'Advanced reporting', 'Priority support', 'Calendar integration']),
('Premium', 149.99, 'monthly', ARRAY['Unlimited rooms', 'Custom reports', '24/7 support', 'API access', 'Multi-property management']);

-- Add trigger for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();