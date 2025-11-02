-- Change hotels and subscriptions to use subscription_plans table instead of enum

-- Add plan_id column to hotels table
ALTER TABLE public.hotels 
ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id);

-- Migrate existing data based on subscription_plan enum to plan_id
UPDATE public.hotels h
SET plan_id = sp.id
FROM public.subscription_plans sp
WHERE LOWER(h.subscription_plan::text) = LOWER(sp.name);

-- Add plan_id column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id);

-- Migrate existing subscriptions data
UPDATE public.subscriptions s
SET plan_id = sp.id
FROM public.subscription_plans sp
WHERE LOWER(s.plan::text) = LOWER(sp.name);

-- Set default plan_id to basic plan for hotels without a match
UPDATE public.hotels h
SET plan_id = (SELECT id FROM public.subscription_plans WHERE LOWER(name) = 'basic' LIMIT 1)
WHERE plan_id IS NULL;

-- Set default plan_id for subscriptions without a match
UPDATE public.subscriptions s
SET plan_id = (SELECT id FROM public.subscription_plans WHERE LOWER(name) = 'basic' LIMIT 1)
WHERE plan_id IS NULL;

-- Now we can safely make plan_id NOT NULL after setting defaults
ALTER TABLE public.hotels ALTER COLUMN plan_id SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN plan_id SET NOT NULL;

-- Keep the old columns for now as fallback (we can remove them later once everything works)
-- But add a comment to indicate they're deprecated
COMMENT ON COLUMN public.hotels.subscription_plan IS 'DEPRECATED: Use plan_id instead';
COMMENT ON COLUMN public.subscriptions.plan IS 'DEPRECATED: Use plan_id instead';