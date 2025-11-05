-- Add total_amount column to leads table
ALTER TABLE public.leads
ADD COLUMN total_amount numeric DEFAULT 0;