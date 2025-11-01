-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Hotel admins can view their notifications" 
ON public.notifications 
FOR SELECT 
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can update their notifications" 
ON public.notifications 
FOR UPDATE 
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can delete their notifications" 
ON public.notifications 
FOR DELETE 
USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Super admins can view all notifications" 
ON public.notifications 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();