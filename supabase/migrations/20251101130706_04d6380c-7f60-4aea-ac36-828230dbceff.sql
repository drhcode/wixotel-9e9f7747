-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Hotel admins can view their leads
CREATE POLICY "Hotel admins can view their leads"
ON public.leads
FOR SELECT
USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Hotel admins can update their leads
CREATE POLICY "Hotel admins can update their leads"
ON public.leads
FOR UPDATE
USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Hotel admins can delete their leads
CREATE POLICY "Hotel admins can delete their leads"
ON public.leads
FOR DELETE
USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Anyone can insert leads (public form)
CREATE POLICY "Anyone can insert leads"
ON public.leads
FOR INSERT
WITH CHECK (true);

-- Super admins can view all leads
CREATE POLICY "Super admins can view all leads"
ON public.leads
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();