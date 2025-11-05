-- Add source column to bookings to track if it came from a lead or manual entry
ALTER TABLE bookings 
ADD COLUMN source TEXT DEFAULT 'manual' CHECK (source IN ('lead', 'manual'));

-- Update existing bookings created from leads to have 'lead' source
UPDATE bookings
SET source = 'lead'
WHERE id IN (
  SELECT DISTINCT booking_id 
  FROM earnings 
  WHERE lead_id IS NOT NULL
);

-- Create cancellation_requests table for lead-based bookings
CREATE TABLE IF NOT EXISTS cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on cancellation_requests
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Hotel admins can create and view their own cancellation requests
CREATE POLICY "Hotel admins can create cancellation requests"
ON cancellation_requests FOR INSERT
WITH CHECK (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can view their cancellation requests"
ON cancellation_requests FOR SELECT
USING (hotel_id = get_user_hotel_id(auth.uid()));

-- Super admins can manage all cancellation requests
CREATE POLICY "Super admins can manage cancellation requests"
ON cancellation_requests FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Add updated_at trigger for cancellation_requests
CREATE TRIGGER update_cancellation_requests_updated_at
BEFORE UPDATE ON cancellation_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();