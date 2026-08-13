-- Security definer helper to read protected fields without RLS recursion
CREATE OR REPLACE FUNCTION public.hotel_protected_fields_unchanged(
  _hotel_id uuid,
  _status hotel_status,
  _is_verified boolean,
  _is_featured boolean,
  _plan_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hotels h
    WHERE h.id = _hotel_id
      AND h.status IS NOT DISTINCT FROM _status
      AND h.is_verified IS NOT DISTINCT FROM _is_verified
      AND h.is_featured IS NOT DISTINCT FROM _is_featured
      AND h.plan_id IS NOT DISTINCT FROM _plan_id
  )
$$;

-- Tighten the hotel admin update policy with a WITH CHECK clause
DROP POLICY IF EXISTS "Hotel admins can update their own hotel" ON public.hotels;

CREATE POLICY "Hotel admins can update their own hotel"
ON public.hotels
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (
  auth.uid() = owner_id
  AND public.hotel_protected_fields_unchanged(id, status, is_verified, is_featured, plan_id)
);

-- Defense in depth: block protected field changes at the row level too
CREATE OR REPLACE FUNCTION public.protect_hotel_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
       OR NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
      RAISE EXCEPTION 'Only super admins can modify hotel status, verification, featured flag, or plan';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_hotel_admin_fields_trigger ON public.hotels;
CREATE TRIGGER protect_hotel_admin_fields_trigger
BEFORE UPDATE ON public.hotels
FOR EACH ROW EXECUTE FUNCTION public.protect_hotel_admin_fields();