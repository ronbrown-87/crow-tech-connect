-- Create user types enum
CREATE TYPE public.user_type AS ENUM ('client', 'service_provider', 'admin');

-- Create approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create service categories enum  
CREATE TYPE public.service_category AS ENUM (
  'construction', 
  'plumbing', 
  'electrical', 
  'roofing', 
  'tiling', 
  'surveying', 
  'maintenance'
);

-- Create request status enum
CREATE TYPE public.request_status AS ENUM (
  'pending', 
  'assigned', 
  'in_progress', 
  'completed', 
  'cancelled'
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  user_type user_type NOT NULL DEFAULT 'client',
  approval_status approval_status NOT NULL DEFAULT 'pending',
  subscription_fee_paid BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create service providers table
CREATE TABLE public.service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  business_description TEXT,
  license_number TEXT,
  years_experience INTEGER,
  service_categories service_category[] NOT NULL,
  hourly_rate DECIMAL(10,2),
  portfolio_images TEXT[],
  certifications TEXT[],
  rating DECIMAL(3,2) DEFAULT 0.0,
  total_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category service_category NOT NULL,
  base_price DECIMAL(10,2),
  duration_estimate TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create service requests table
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_provider_id UUID REFERENCES public.service_providers(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  preferred_date TIMESTAMPTZ,
  budget_range TEXT,
  status request_status DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_type TEXT NOT NULL, -- 'subscription', 'service', 'registration'
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending',
  service_request_id UUID REFERENCES public.service_requests(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  service_provider_id UUID NOT NULL REFERENCES public.service_providers(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Approved service providers are viewable" ON public.profiles
  FOR SELECT USING (user_type = 'service_provider' AND approval_status = 'approved');

-- RLS Policies for service providers
CREATE POLICY "Service providers can manage their own data" ON public.service_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = service_providers.profile_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Approved service providers are viewable" ON public.service_providers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = service_providers.profile_id 
      AND profiles.approval_status = 'approved'
    )
  );

-- RLS Policies for services
CREATE POLICY "Services are viewable by all authenticated users" ON public.services
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- RLS Policies for service requests
CREATE POLICY "Clients can manage their own requests" ON public.service_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = service_requests.client_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Service providers can view assigned requests" ON public.service_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_providers sp
      JOIN public.profiles p ON p.id = sp.profile_id
      WHERE sp.id = service_requests.service_provider_id 
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by all authenticated users" ON public.reviews
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Clients can create reviews for their completed requests" ON public.reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = reviews.client_id 
      AND profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_providers_updated_at BEFORE UPDATE ON public.service_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial services
INSERT INTO public.services (name, description, category, base_price, duration_estimate) VALUES
('Building Construction', 'Complete building construction services', 'construction', 50000.00, '3-6 months'),
('Plumbing Installation', 'Professional plumbing installation and repair', 'plumbing', 150.00, '1-2 days'),
('Domestic House Wiring', 'Electrical wiring for residential properties', 'electrical', 200.00, '2-3 days'),
('Roofing Services', 'Roof installation, repair and maintenance', 'roofing', 300.00, '3-5 days'),
('Tile Installation', 'Professional tiling services', 'tiling', 100.00, '1-2 days'),
('Property Survey', 'Professional property surveying services', 'surveying', 500.00, '1-2 weeks'),
('General Maintenance', 'Property maintenance and repair services', 'maintenance', 80.00, '1 day');