-- Create languages table
CREATE TABLE IF NOT EXISTS public.languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  native_name text NOT NULL,
  flag_emoji text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create translation namespaces for organization
CREATE TABLE IF NOT EXISTS public.translation_namespaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create translation keys
CREATE TABLE IF NOT EXISTS public.translation_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  namespace_id uuid NOT NULL REFERENCES public.translation_namespaces(id) ON DELETE CASCADE,
  default_value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create translations
CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES public.translation_keys(id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  translated_text text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  translated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(key_id, language_code)
);

-- Create hotel translations for dynamic content
CREATE TABLE IF NOT EXISTS public.hotel_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  name text,
  description text,
  about_us text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, language_code)
);

-- Create room translations for dynamic content
CREATE TABLE IF NOT EXISTS public.room_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  language_code text NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
  name text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, language_code)
);

-- Enable RLS
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_namespaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for languages
CREATE POLICY "Anyone can view active languages" ON public.languages
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage languages" ON public.languages
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for translation_namespaces
CREATE POLICY "Anyone can view namespaces" ON public.translation_namespaces
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage namespaces" ON public.translation_namespaces
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for translation_keys
CREATE POLICY "Anyone can view translation keys" ON public.translation_keys
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage translation keys" ON public.translation_keys
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for translations
CREATE POLICY "Anyone can view translations" ON public.translations
  FOR SELECT USING (true);

CREATE POLICY "Super admins can manage translations" ON public.translations
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for hotel_translations
CREATE POLICY "Anyone can view hotel translations" ON public.hotel_translations
  FOR SELECT USING (true);

CREATE POLICY "Hotel admins can manage their hotel translations" ON public.hotel_translations
  FOR ALL USING (hotel_id = get_user_hotel_id(auth.uid()));

CREATE POLICY "Super admins can manage all hotel translations" ON public.hotel_translations
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies for room_translations
CREATE POLICY "Anyone can view room translations" ON public.room_translations
  FOR SELECT USING (true);

CREATE POLICY "Hotel admins can manage their room translations" ON public.room_translations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.id = room_translations.room_id 
      AND r.hotel_id = get_user_hotel_id(auth.uid())
    )
  );

CREATE POLICY "Super admins can manage all room translations" ON public.room_translations
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Create indexes for performance
CREATE INDEX idx_translation_keys_namespace ON public.translation_keys(namespace_id);
CREATE INDEX idx_translation_keys_key ON public.translation_keys(key);
CREATE INDEX idx_translations_key_lang ON public.translations(key_id, language_code);
CREATE INDEX idx_translations_language ON public.translations(language_code);
CREATE INDEX idx_hotel_translations_hotel_lang ON public.hotel_translations(hotel_id, language_code);
CREATE INDEX idx_room_translations_room_lang ON public.room_translations(room_id, language_code);

-- Add triggers for updated_at
CREATE TRIGGER update_languages_updated_at BEFORE UPDATE ON public.languages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translation_keys_updated_at BEFORE UPDATE ON public.translation_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON public.translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_translations_updated_at BEFORE UPDATE ON public.hotel_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_translations_updated_at BEFORE UPDATE ON public.room_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default language (English)
INSERT INTO public.languages (code, name, native_name, flag_emoji, is_active, is_default)
VALUES ('en', 'English', 'English', '🇬🇧', true, true);

-- Insert initial namespaces
INSERT INTO public.translation_namespaces (code, name, description) VALUES
  ('ui', 'User Interface', 'General UI elements like buttons, labels, navigation'),
  ('auth', 'Authentication', 'Login, signup, password related text'),
  ('hotel', 'Hotel Management', 'Hotel-specific management interface'),
  ('booking', 'Bookings', 'Booking and reservation related text'),
  ('email', 'Email Templates', 'Email notification templates'),
  ('notifications', 'Notifications', 'In-app notification messages'),
  ('errors', 'Error Messages', 'Error and validation messages'),
  ('landing', 'Landing Page', 'Public landing page content');