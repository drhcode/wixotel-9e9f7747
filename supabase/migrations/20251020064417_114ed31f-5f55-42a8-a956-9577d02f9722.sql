-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'hotel_admin');

-- Create enum for hotel status
CREATE TYPE public.hotel_status AS ENUM ('pending', 'active', 'suspended');

-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('basic', 'pro', 'premium');

-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create enum for payment method
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'online');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'hotel_admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create hotels table
CREATE TABLE public.hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    email TEXT,
    phone TEXT,
    status public.hotel_status NOT NULL DEFAULT 'pending',
    subscription_plan public.subscription_plan DEFAULT 'basic',
    logo_url TEXT,
    images TEXT[],
    amenities TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 2,
    amenities TEXT[],
    images TEXT[],
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create guests table
CREATE TABLE public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    id_number TEXT,
    preferences TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status public.booking_status NOT NULL DEFAULT 'pending',
    payment_status public.payment_status NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    method public.payment_method NOT NULL,
    status public.payment_status NOT NULL DEFAULT 'pending',
    stripe_id TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    plan public.subscription_plan NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ NOT NULL,
    status public.payment_status NOT NULL DEFAULT 'pending',
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to get user's hotel_id
CREATE OR REPLACE FUNCTION public.get_user_hotel_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.hotels
  WHERE owner_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for hotels
CREATE POLICY "Super admins can view all hotels"
ON public.hotels FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Hotel admins can view their own hotel"
ON public.hotels FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Hotel admins can insert their own hotel"
ON public.hotels FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Hotel admins can update their own hotel"
ON public.hotels FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Super admins can update all hotels"
ON public.hotels FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete hotels"
ON public.hotels FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for rooms
CREATE POLICY "Anyone can view available rooms"
ON public.rooms FOR SELECT
USING (is_available = true);

CREATE POLICY "Hotel admins can view their hotel rooms"
ON public.rooms FOR SELECT
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can insert rooms"
ON public.rooms FOR INSERT
WITH CHECK (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can update their rooms"
ON public.rooms FOR UPDATE
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can delete their rooms"
ON public.rooms FOR DELETE
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

-- RLS Policies for guests
CREATE POLICY "Hotel admins can view their guests"
ON public.guests FOR SELECT
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can insert guests"
ON public.guests FOR INSERT
WITH CHECK (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can update their guests"
ON public.guests FOR UPDATE
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can delete their guests"
ON public.guests FOR DELETE
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

-- RLS Policies for bookings
CREATE POLICY "Hotel admins can view their hotel bookings"
ON public.bookings FOR SELECT
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can insert bookings"
ON public.bookings FOR INSERT
WITH CHECK (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can update their bookings"
ON public.bookings FOR UPDATE
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can delete their bookings"
ON public.bookings FOR DELETE
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

-- RLS Policies for payments
CREATE POLICY "Hotel admins can view their payments"
ON public.payments FOR SELECT
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Hotel admins can insert payments"
ON public.payments FOR INSERT
WITH CHECK (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Super admins can view all payments"
ON public.payments FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for subscriptions
CREATE POLICY "Hotel admins can view their subscriptions"
ON public.subscriptions FOR SELECT
USING (hotel_id = public.get_user_hotel_id(auth.uid()));

CREATE POLICY "Super admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage subscriptions"
ON public.subscriptions FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  -- Default to hotel_admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'hotel_admin');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();