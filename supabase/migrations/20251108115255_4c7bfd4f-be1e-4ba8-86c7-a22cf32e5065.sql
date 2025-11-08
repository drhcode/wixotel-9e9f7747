-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'database-backups',
  'database-backups',
  false,
  52428800, -- 50MB limit
  ARRAY['application/json', 'application/zip']
);

-- RLS policies for backup bucket
CREATE POLICY "Super admins can upload backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'database-backups' AND
  (SELECT has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Super admins can view backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'database-backups' AND
  (SELECT has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Super admins can delete backups"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'database-backups' AND
  (SELECT has_role(auth.uid(), 'super_admin'))
);

-- Create backup logs table
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  backup_type TEXT NOT NULL DEFAULT 'manual',
  tables_included TEXT[] NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup logs
CREATE POLICY "Super admins can view backup logs"
ON public.backup_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert backup logs"
ON public.backup_logs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete backup logs"
ON public.backup_logs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));