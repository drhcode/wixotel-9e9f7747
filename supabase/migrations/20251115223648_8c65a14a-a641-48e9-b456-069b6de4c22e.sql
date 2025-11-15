-- Add IP address and device tracking fields to leads table
ALTER TABLE public.leads 
ADD COLUMN ip_address text,
ADD COLUMN device_type text,
ADD COLUMN browser text,
ADD COLUMN user_agent text;

-- Add index for performance on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Add comment explaining data retention policy
COMMENT ON COLUMN public.leads.ip_address IS 'IP address captured for fraud prevention and security (retained for 90 days)';
COMMENT ON COLUMN public.leads.device_type IS 'Device type (mobile/tablet/desktop) for analytics';
COMMENT ON COLUMN public.leads.browser IS 'Browser information for technical support';
COMMENT ON COLUMN public.leads.user_agent IS 'Full user agent string for detailed device info';